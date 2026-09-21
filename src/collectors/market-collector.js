import { appendBounded, writeObservation } from "../core/observation-store.js";
import { runCollector } from "./collector-runtime.js";
const DOMAIN = "market";
const HISTORY = "data/observations/market-history.json";
export async function main(ns) {
    await runCollector(ns, { service: "market-collector", domain: DOMAIN, intervalMs: 6_000, minimumIntervalMs: 1_000 }, async () => {
        const capabilities = {
            wse: ns.stock.hasWseAccount(), tix: ns.stock.hasTixApiAccess(),
            fourS: ns.stock.has4SData(), fourSTix: ns.stock.has4SDataTixApi(),
        };
        if (!capabilities.tix) {
            writeObservation(ns, DOMAIN, "market-collector", "unavailable", { capabilities, symbols: [] });
            return { status: "unavailable", phase: "waiting-capability" };
        }
        const symbols = ns.stock.getSymbols().map((symbol) => {
            const bid = ns.stock.getBidPrice(symbol), ask = ns.stock.getAskPrice(symbol);
            const item = {
                symbol, organization: ns.stock.getOrganization(symbol), price: ns.stock.getPrice(symbol),
                bid, ask, spread: ask - bid, mid: (ask + bid) / 2, maxShares: ns.stock.getMaxShares(symbol),
                position: ns.stock.getPosition(symbol),
            };
            if (capabilities.fourSTix) {
                item.forecast = ns.stock.getForecast(symbol);
                item.volatility = ns.stock.getVolatility(symbol);
            }
            return item;
        });
        const { value: observation } = writeObservation(ns, DOMAIN, "market-collector", "available", { capabilities, symbols });
        appendBounded(ns, HISTORY, { observedAt: observation.observedAt, prices: Object.fromEntries(symbols.map((x) => [x.symbol, x.price])) }, 240);
        return { status: "available" };
    });
}
