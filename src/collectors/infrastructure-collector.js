import { writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";

const DOMAIN = "infrastructure";

/** @param {NS} ns */
export async function main(ns) {
    await runCollector(ns, {
        service: "infrastructure-collector",
        domain: DOMAIN,
        intervalMs: 5_000,
        minimumIntervalMs: 1_000,
    }, async () => {
        const cloudServers = ns.cloud.getServerNames().map((host) => {
            const server = ns.getServer(host);
            return {
                host,
                maxRam: server.maxRam,
                ramUsed: server.ramUsed,
                cpuCores: server.cpuCores,
            };
        });

        const nodes = [];
        for (let index = 0; index < ns.hacknet.numNodes(); index += 1) {
            nodes.push({ index, ...ns.hacknet.getNodeStats(index) });
        }

        const home = ns.getServer("home");
        writeObservation(ns, DOMAIN, "infrastructure-collector", "available", {
            home: {
                maxRam: home.maxRam,
                ramUsed: home.ramUsed,
                cpuCores: home.cpuCores,
            },
            cloudServers,
            hacknet: {
                nodeCount: nodes.length,
                nodes,
            },
        });

        return { status: "available" };
    });
}
