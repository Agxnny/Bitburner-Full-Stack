import { PORTS } from "./ports.js";
import { canonicalEnvelope, canonicalStatePath, validCanonicalState, validObservation } from "./state-contract.js";
import { readJson } from "./observation-store.js";
import { publishTelemetry, serviceEvent, serviceHealth } from "./telemetry.js";
import { wallNow } from "./time.js";

const SERVICE = "canonical-state";
const OBSERVATION_DOMAINS = ["player", "network", "market", "infrastructure", "capabilities"];
const DOMAINS = [...OBSERVATION_DOMAINS, "associations"];
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
    deriveAssociations(ns, revisions);

    while (true) {
        let accepted = 0;
        accepted += drain(ns, PORTS.OBSERVATION_INGRESS, revisions);
        accepted += drain(ns, PORTS.MARKET_OBSERVATION_INGRESS, revisions);
        reconcileSnapshots(ns, revisions);
        deriveAssociations(ns, revisions);

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
    for (const domain of OBSERVATION_DOMAINS) {
        const value = readJson(ns, `data/observations/${domain}.json`, null);
        if (validObservation(value)) accept(ns, value, revisions);
    }
}

function deriveAssociations(ns, revisions) {
    const network = readJson(ns, canonicalStatePath("network"), null);
    const market = readJson(ns, canonicalStatePath("market"), null);
    if (!validCanonicalState(network) || !validCanonicalState(market)) return false;

    const available = network.availability === "available" && market.availability === "available";
    const servers = Array.isArray(network.data?.servers) ? network.data.servers : [];
    const symbols = Array.isArray(market.data?.symbols) ? market.data.symbols : [];
    const serversByOrganization = new Map();
    for (const server of servers) {
        const organization = String(server?.organizationName ?? "").trim();
        const hostname = String(server?.hostname ?? "").trim();
        if (!organization || !hostname) continue;
        const list = serversByOrganization.get(organization) ?? [];
        list.push(hostname);
        serversByOrganization.set(organization, list);
    }

    const associations = [], unmatchedStocks = [];
    for (const stock of symbols) {
        const symbol = String(stock?.symbol ?? "").trim();
        const organization = String(stock?.organization ?? "").trim();
        if (!symbol || !organization) continue;
        const hosts = [...(serversByOrganization.get(organization) ?? [])].sort();
        if (!hosts.length) unmatchedStocks.push({ symbol, organization });
        for (const hostname of hosts) associations.push({ symbol, organization, hostname });
    }
    associations.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.hostname.localeCompare(b.hostname));
    unmatchedStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
    const linkedHosts = new Set(associations.map((x) => x.hostname));
    const unmatchedServers = servers
        .filter((server) => String(server?.organizationName ?? "").trim() && !linkedHosts.has(server.hostname))
        .map((server) => ({ hostname: server.hostname, organization: server.organizationName }))
        .sort((a, b) => a.hostname.localeCompare(b.hostname));

    const observedAt = Math.min(network.observedAt, market.observedAt);
    const data = {
        source: {
            network: { revision: network.revision, observedAt: network.observedAt },
            market: { revision: market.revision, observedAt: market.observedAt },
        },
        associations,
        unmatchedStocks,
        unmatchedServers,
    };
    const current = readJson(ns, canonicalStatePath("associations"), null);
    const signature = JSON.stringify(data);
    if (validCanonicalState(current) && current.observedAt === observedAt && JSON.stringify(current.data) === signature) return false;
    const revision = Math.max(revisions.associations ?? 0, validCanonicalState(current) ? current.revision : 0) + 1;
    const value = {
        schemaVersion: 1, kind: "canonical-state", domain: "associations", revision,
        observedAt, canonicalizedAt: wallNow(), producer: SERVICE,
        availability: available ? "available" : "unavailable",
        reason: available ? null : "source-unavailable", data,
    };
    ns.write(canonicalStatePath("associations"), JSON.stringify(value, null, 2), "w");
    revisions.associations = revision;
    return true;
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
