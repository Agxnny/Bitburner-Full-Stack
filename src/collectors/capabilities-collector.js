import { writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";
const DOMAIN = "capabilities";
function probe(fn) { try { return { available: true, value: fn() }; } catch (e) { return { available: false, reason: String(e?.message ?? e) }; } }
export async function main(ns) {
    await runCollector(ns, { service: "capabilities-collector", domain: DOMAIN, intervalMs: 15_000 }, async () => {
        const data = {
            stock: {
                wse: ns.stock.hasWseAccount(), tix: ns.stock.hasTixApiAccess(),
                fourS: ns.stock.has4SData(), fourSTix: ns.stock.has4SDataTixApi(),
            },
            gang: probe(() => ns.gang.inGang()),
            corporation: probe(() => ns.corporation.hasCorporation()),
            bladeburner: probe(() => ns.bladeburner.inBladeburner()),
            sleeves: probe(() => ns.sleeve.getNumSleeves()),
            formulas: probe(() => Boolean(ns.formulas?.skills)),
            torRouter: ns.hasTorRouter(),
        };
        writeObservation(ns, DOMAIN, "capabilities-collector", "available", data, { freshForMs: 45_000 });
        return { status: "available" };
    });
}
