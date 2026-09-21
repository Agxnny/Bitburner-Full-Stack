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
});

export function observationPort(domain) {
    return domain === "market" ? PORTS.MARKET_OBSERVATION_INGRESS : PORTS.OBSERVATION_INGRESS;
}
