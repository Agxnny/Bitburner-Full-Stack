import { writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";
const DOMAIN = "infrastructure";
export async function main(ns) {
    await runCollector(ns, { service: "infrastructure-collector", domain: DOMAIN, intervalMs: 5_000 }, async () => {
        const purchasedServers = ns.getPurchasedServers().map((host) => {
            const s = ns.getServer(host);
            return { host, maxRam: s.maxRam, ramUsed: s.ramUsed, cpuCores: s.cpuCores };
        });
        const nodes = [];
        for (let i = 0; i < ns.hacknet.numNodes(); i++) nodes.push({ index: i, ...ns.hacknet.getNodeStats(i) });
        const home = ns.getServer("home");
        writeObservation(ns, DOMAIN, "infrastructure-collector", "available", {
            home: { maxRam: home.maxRam, ramUsed: home.ramUsed, cpuCores: home.cpuCores },
            purchasedServers, hacknet: { nodeCount: nodes.length, nodes },
        }, { freshForMs: 15_000 });
        return { status: "available" };
    });
}
