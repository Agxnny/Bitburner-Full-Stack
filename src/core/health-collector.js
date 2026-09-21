import {
    TELEMETRY_PORT,
    HEALTH_SNAPSHOT_PATH,
    INCIDENTS_PATH,
    serviceHealth,
    validHealthRecord,
    validEventRecord,
} from "./telemetry.js";

const SCRIPT_PATH = "src/core/health-collector.js";
const DASHBOARD_PATH = "src/ui/system-health-dashboard.jsx";
const LOOP_MS = 500;
const SELF_HEARTBEAT_MS = 5_000;
const INCIDENT_LIMIT = 40;
const RECOVERY_LIMIT = 20;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | health-collector must run on home");
        return;
    }
    const copies = ns.ps("home").filter((p) => p.filename === SCRIPT_PATH).sort((a, b) => a.pid - b.pid);
    if (copies.length && copies[0].pid !== ns.pid) return;

    ns.disableLog("sleep");
    ns.disableLog("ps");
    ns.disableLog("run");

    const services = new Map();
    let incidents = readIncidents(ns);
    let invalidRecords = 0;
    let nextSelfAt = 0;
    ensureDashboard(ns);

    while (true) {
        const now = Date.now();
        if (now >= nextSelfAt) {
            const self = ingestHealth(services, serviceHealth(ns, "health-collector", {
                lifecycle: "persistent",
                health: "healthy",
                phase: "collecting",
                staleAfterMs: 12_000,
            }), now);
            for (const incident of self.incidents) incidents = addIncident(incidents, incident);
            nextSelfAt = now + SELF_HEARTBEAT_MS;
        }

        let changed = false;
        while (true) {
            const raw = ns.readPort(TELEMETRY_PORT);
            if (raw === "NULL PORT DATA") break;
            let record;
            try { record = JSON.parse(String(raw)); } catch { record = null; }
            if (validHealthRecord(record)) {
                const result = ingestHealth(services, record, now);
                for (const incident of result.incidents) incidents = addIncident(incidents, incident);
                changed = true;
            } else if (validEventRecord(record)) {
                if (record.severity !== "info") incidents = addIncident(incidents, eventIncident(record));
                changed = true;
            } else {
                invalidRecords += 1;
                incidents = addIncident(incidents, {
                    at: now, service: "telemetry", severity: "warning", code: "INVALID_RECORD",
                    message: "Rejected malformed telemetry record.", host: "home", instanceId: null,
                });
                changed = true;
            }
        }

        for (const entry of services.values()) {
            const stale = now - entry.heartbeatAt > entry.staleAfterMs;
            if (stale && entry.effectiveHealth !== "stale") {
                entry.effectiveHealth = "stale";
                entry.effectiveReason = `No heartbeat for ${now - entry.heartbeatAt}ms.`;
                incidents = addIncident(incidents, {
                    at: now, service: entry.service, severity: "warning", code: "SERVICE_STALE",
                    message: entry.effectiveReason, host: entry.host, instanceId: entry.instanceId,
                });
                changed = true;
            }
        }

        if (changed || now % 5_000 < LOOP_MS) {
            writeSnapshot(ns, services, invalidRecords, now);
            ns.write(INCIDENTS_PATH, JSON.stringify({ schemaVersion: 1, updatedAt: now, incidents }, null, 2), "w");
        }
        ensureDashboard(ns);
        await ns.sleep(LOOP_MS);
    }
}

function ingestHealth(services, record, now) {
    const incidents = [];
    const previousInstance = services.get(record.instanceId);
    const replaced = [...services.values()].filter((entry) =>
        entry.service === record.service && entry.instanceId !== record.instanceId
    );

    for (const entry of replaced) {
        services.delete(entry.instanceId);
        incidents.push({
            at: now,
            service: record.service,
            severity: "info",
            code: "SERVICE_INSTANCE_REPLACED",
            message: `Active instance moved from ${entry.host}:pid ${entry.pid} to ${record.host}:pid ${record.pid}.`,
            host: record.host,
            instanceId: record.instanceId,
            previousInstanceId: entry.instanceId,
        });
        if (entry.effectiveHealth !== "healthy" && record.health === "healthy") {
            incidents.push({
                at: now,
                service: record.service,
                severity: "info",
                code: "SERVICE_RECOVERED",
                message: `Recovered from ${entry.effectiveHealth} with replacement instance.`,
                host: record.host,
                instanceId: record.instanceId,
                previousInstanceId: entry.instanceId,
            });
        }
    }

    const next = {
        ...record,
        receivedAt: now,
        observedSince: previousInstance?.observedSince ?? now,
        effectiveHealth: record.health,
        effectiveReason: record.reason,
    };
    services.set(record.instanceId, next);

    if (previousInstance) {
        const was = previousInstance.effectiveHealth;
        const is = next.effectiveHealth;
        if (was !== is) {
            incidents.push(is === "healthy"
                ? {
                    at: now, service: record.service, severity: "info", code: "SERVICE_RECOVERED",
                    message: `Recovered from ${was}.`, host: record.host, instanceId: record.instanceId,
                }
                : {
                    at: now, service: record.service, severity: is === "failed" ? "error" : "warning",
                    code: is === "failed" ? "SERVICE_FAILED" : "SERVICE_DEGRADED",
                    message: record.reason ?? `Health changed to ${is}.`, host: record.host, instanceId: record.instanceId,
                });
        }
    }

    return { incidents };
}

function writeSnapshot(ns, services, invalidRecords, now) {
    const list = [...services.values()].map((entry) => ({
        service: entry.service,
        instanceId: entry.instanceId,
        host: entry.host,
        pid: entry.pid,
        lifecycle: entry.lifecycle,
        health: entry.effectiveHealth,
        reportedHealth: entry.health,
        phase: entry.phase,
        reason: entry.effectiveReason,
        heartbeatAt: entry.heartbeatAt,
        receivedAt: entry.receivedAt,
        observedSince: entry.observedSince,
        staleAfterMs: entry.staleAfterMs,
    })).sort((a, b) => a.service.localeCompare(b.service) || a.instanceId.localeCompare(b.instanceId));

    const counts = { healthy: 0, degraded: 0, failed: 0, stale: 0 };
    for (const item of list) counts[item.health] = (counts[item.health] ?? 0) + 1;
    const overall = counts.failed ? "failed" : (counts.degraded || counts.stale) ? "degraded" : "healthy";
    ns.write(HEALTH_SNAPSHOT_PATH, JSON.stringify({
        schemaVersion: 1,
        owner: "health-collector",
        generatedAt: now,
        overall,
        counts,
        serviceCount: list.length,
        invalidRecords,
        services: list,
    }, null, 2), "w");
}

function addIncident(items, incident) {
    const uniqueOperational = incident.severity === "warning" || incident.severity === "error";
    const retained = uniqueOperational
        ? items.filter((item) => !sameIncidentIdentity(item, incident))
        : items;
    const next = [...retained, incident];
    const recoveries = next.filter((x) => x.code === "SERVICE_RECOVERED");
    if (recoveries.length > RECOVERY_LIMIT) {
        const remove = new Set(recoveries.slice(0, recoveries.length - RECOVERY_LIMIT));
        return next.filter((x) => !remove.has(x)).slice(-INCIDENT_LIMIT);
    }
    return next.slice(-INCIDENT_LIMIT);
}

function sameIncidentIdentity(left, right) {
    const leftOperational = left?.severity === "warning" || left?.severity === "error";
    return leftOperational
        && left.service === right.service
        && left.code === right.code;
}

function eventIncident(record) {
    return {
        at: record.emittedAt, service: record.service, severity: record.severity,
        code: record.code, message: record.message, host: record.host, instanceId: record.instanceId,
    };
}

function readIncidents(ns) {
    try {
        const value = JSON.parse(ns.read(INCIDENTS_PATH));
        if (!Array.isArray(value?.incidents)) return [];
        return value.incidents
            .slice(-INCIDENT_LIMIT)
            .reduce((items, incident) => addIncident(items, incident), []);
    } catch { return []; }
}

function ensureDashboard(ns) {
    const running = ns.ps("home").some((p) => p.filename === DASHBOARD_PATH);
    if (!running) ns.run(DASHBOARD_PATH, 1);
}
