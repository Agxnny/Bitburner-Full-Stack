import { writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";
const DOMAIN = "network";
export async function main(ns) {
    await runCollector(ns, { service: "network-collector", domain: DOMAIN, intervalMs: 5_000 }, async () => {
        const seen = new Set(["home"]), queue = ["home"], topology = {}, servers = [];
        while (queue.length) {
            const host = queue.shift();
            const neighbors = ns.scan(host);
            topology[host] = neighbors;
            for (const next of neighbors) if (!seen.has(next)) { seen.add(next); queue.push(next); }
            const s = ns.getServer(host);
            servers.push({
                hostname: s.hostname, hasAdminRights: s.hasAdminRights, purchasedByPlayer: s.purchasedByPlayer,
                maxRam: s.maxRam, ramUsed: s.ramUsed, cpuCores: s.cpuCores,
                moneyAvailable: s.moneyAvailable, moneyMax: s.moneyMax,
                hackDifficulty: s.hackDifficulty, minDifficulty: s.minDifficulty,
                requiredHackingSkill: s.requiredHackingSkill, numOpenPortsRequired: s.numOpenPortsRequired,
                openPortCount: s.openPortCount, serverGrowth: s.serverGrowth, organizationName: s.organizationName,
                backdoorInstalled: s.backdoorInstalled, isOnline: s.isOnline ?? true,
            });
        }
        writeObservation(ns, DOMAIN, "network-collector", "available", { topology, servers }, { freshForMs: 15_000 });
        return { status: "available" };
    });
}
