/**
 * Central port reservation map.
 * Port 1 is the existing M2 telemetry ingress.
 * Ports are transient queues, never canonical state or broadcast/pub-sub.
 */
export const PORTS = Object.freeze({
    TELEMETRY: 1,
    OBSERVATION_INGRESS: 2,
    COLLECTION_CONTROL: 3,
    MARKET_OBSERVATION_INGRESS: 4,
    MARKET_CONTROL: 5,
    DIAGNOSTICS: 6,
    AUTHORITY: 7,
    WORK_ORDERS: 8,
    EXECUTION_SCHEDULER: 9,
    RESOURCE_BUDGETS: 10,
});

export function observationPort(domain) {
    return domain === "market" ? PORTS.MARKET_OBSERVATION_INGRESS : PORTS.OBSERVATION_INGRESS;
}
