import { publishTelemetry, serviceEvent, serviceHealth } from "../core/telemetry.js";
export async function runCollector(ns, config, collect) {
    ns.disableLog("sleep");
    let lastFailure = null;
    while (true) {
        const startedAt = Date.now();
        try {
            const result = await collect();
            publishTelemetry(ns, serviceHealth(ns, config.service, {
                health: result.health ?? "healthy", phase: result.phase ?? "collecting",
                reason: result.reason ?? null, staleAfterMs: config.staleAfterMs ?? config.intervalMs * 3,
                details: { domain: config.domain, status: result.status ?? "available" },
            }));
            if (lastFailure) publishTelemetry(ns, serviceEvent(ns, config.service, "info", "COLLECTOR_RECOVERED", "Collector recovered."));
            lastFailure = null;
        } catch (error) {
            const message = String(error?.message ?? error);
            publishTelemetry(ns, serviceHealth(ns, config.service, {
                health: "degraded", phase: "collection-error", reason: message,
                staleAfterMs: config.staleAfterMs ?? config.intervalMs * 3,
            }));
            if (message !== lastFailure) publishTelemetry(ns, serviceEvent(ns, config.service, "warning", "COLLECTION_FAILED", message));
            lastFailure = message;
        }
        await ns.sleep(Math.max(100, config.intervalMs - (Date.now() - startedAt)));
    }
}
