import { writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";
const DOMAIN = "player";
export async function main(ns) {
    await runCollector(ns, { service: "player-collector", domain: DOMAIN, intervalMs: 2_000, minimumIntervalMs: 500 }, async () => {
        const p = ns.getPlayer();
        writeObservation(ns, DOMAIN, "player-collector", "available", {
            money: p.money, city: p.city, hp: p.hp, skills: p.skills, exp: p.exp,
            mults: p.mults, factions: p.factions, jobs: p.jobs,
            entropy: p.entropy, numPeopleKilled: p.numPeopleKilled,
            hasTorRouter: ns.hasTorRouter(),
        });
        return { status: "available" };
    });
}
