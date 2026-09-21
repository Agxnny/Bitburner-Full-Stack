import { PORTS } from "./ports.js";
import { canonicalEnvelope, canonicalStatePath, validCanonicalState, validObservation } from "./state-contract.js";
import { readJson } from "./observation-store.js";
import { publishTelemetry, serviceEvent, serviceHealth } from "./telemetry.js";
import { wallNow } from "./time.js";

const SERVICE = "canonical-state";
const DOMAINS = ["player", "network", "market", "infrastructure", "capabilities"];
const RECONCILE_MS = 1_000;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | canonical-state-service must run on home");
        return;
    }
    ns.disableLog("sleep");
    const startedAt = wallNow();
    const revisions = loadRevisions(ns);
    reconcileSnapshots(ns, revisions);

    while (true) {
        let accepted = 0;
        accepted += drain(ns, PORTS.OBSERVATION_INGRESS, revisions);
        accepted += drain(ns, PORTS.MARKET_OBSERVATION_INGRESS, revisions);
        reconcileSnapshots(ns, revisions);

        publishTelemetry(ns, serviceHealth(ns, SERVICE, {
            startedAt,
            phase: "canonicalizing",
            staleAfterMs: 5_000,
            details: { domains: DOMAINS.length, accepted },
        }));
        await ns.sleep(RECONCILE_MS);
    }
}

function drain(ns, port, revisions) {
    let accepted = 0;
    while (true) {
        const raw = ns.readPort(port);
        if (raw === "NULL PORT DATA") break;
        const value = parse(raw);
        if (!validObservation(value)) {
            publishTelemetry(ns, serviceEvent(ns, SERVICE, "warning", "INVALID_OBSERVATION", "Rejected invalid observation envelope.", { details: { port } }));
            continue;
        }
        if (accept(ns, value, revisions)) accepted += 1;
    }
    return accepted;
}

function reconcileSnapshots(ns, revisions) {
    for (const domain of DOMAINS) {
        const value = readJson(ns, `data/observations/${domain}.json`, null);
        if (validObservation(value)) accept(ns, value, revisions);
    }
}

function accept(ns, observation, revisions) {
    const path = canonicalStatePath(observation.domain);
    const current = readJson(ns, path, null);
    if (validCanonicalState(current) && current.observedAt >= observation.observedAt) return false;
    const revision = Math.max(revisions[observation.domain] ?? 0, validCanonicalState(current) ? current.revision : 0) + 1;
    const value = canonicalEnvelope(observation, revision);
    ns.write(path, JSON.stringify(value, null, 2), "w");
    revisions[observation.domain] = revision;
    return true;
}

function loadRevisions(ns) {
    return Object.fromEntries(DOMAINS.map((domain) => {
        const value = readJson(ns, canonicalStatePath(domain), null);
        return [domain, validCanonicalState(value) ? value.revision : 0];
    }));
}

function parse(value) {
    if (typeof value === "object" && value !== null) return value;
    try { return JSON.parse(String(value)); } catch { return null; }
}
