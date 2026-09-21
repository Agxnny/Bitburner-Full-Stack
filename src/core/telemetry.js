/**
 * Shared M2 telemetry contract.
 * Port transport is global across hosts; the health collector is the single storage owner.
 */
export const TELEMETRY_PORT = 1;
export const HEALTH_SNAPSHOT_PATH = "data/telemetry/health.json";
export const INCIDENTS_PATH = "data/telemetry/incidents.json";
export const HEALTH_STATES = ["healthy", "degraded", "failed"];
export const DEFAULT_STALE_AFTER_MS = 15_000;

export function serviceHealth(ns, service, options = {}) {
    const now = Date.now();
    return {
        schemaVersion: 1,
        kind: "service-health",
        emittedAt: now,
        service,
        instanceId: options.instanceId ?? `${service}:${ns.getHostname()}:${ns.pid}`,
        host: ns.getHostname(),
        pid: ns.pid,
        lifecycle: options.lifecycle ?? "persistent",
        health: options.health ?? "healthy",
        heartbeatAt: options.heartbeatAt ?? now,
        staleAfterMs: options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS,
        phase: options.phase ?? null,
        reason: options.reason ?? null,
        details: options.details ?? null,
    };
}

export function serviceEvent(ns, service, severity, code, message, options = {}) {
    return {
        schemaVersion: 1,
        kind: "service-event",
        emittedAt: Date.now(),
        service,
        instanceId: options.instanceId ?? `${service}:${ns.getHostname()}:${ns.pid}`,
        host: ns.getHostname(),
        pid: ns.pid,
        lifecycle: options.lifecycle ?? "persistent",
        severity,
        code,
        message,
        correlationId: options.correlationId ?? null,
        details: options.details ?? null,
    };
}

export function publishTelemetry(ns, record) {
    const payload = JSON.stringify(record);
    const result = ns.tryWritePort(TELEMETRY_PORT, payload);
    return result === true;
}

export function validHealthRecord(value) {
    return Boolean(
        value
        && value.schemaVersion === 1
        && value.kind === "service-health"
        && validIdentity(value)
        && HEALTH_STATES.includes(value.health)
        && Number.isFinite(value.heartbeatAt)
        && Number.isFinite(value.emittedAt)
        && Number.isFinite(value.staleAfterMs)
        && value.staleAfterMs >= 1_000,
    );
}

export function validEventRecord(value) {
    return Boolean(
        value
        && value.schemaVersion === 1
        && value.kind === "service-event"
        && validIdentity(value)
        && ["info", "warning", "error"].includes(value.severity)
        && typeof value.code === "string"
        && value.code.length > 0
        && typeof value.message === "string"
        && value.message.length > 0
        && Number.isFinite(value.emittedAt),
    );
}

function validIdentity(value) {
    return typeof value.service === "string"
        && value.service.length > 0
        && typeof value.instanceId === "string"
        && value.instanceId.length > 0
        && typeof value.host === "string"
        && value.host.length > 0
        && Number.isSafeInteger(value.pid)
        && value.pid > 0
        && typeof value.lifecycle === "string";
}
