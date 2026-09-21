export const OBSERVATION_ROOT = "data/observations";
export function snapshotPath(domain) { return `${OBSERVATION_ROOT}/${domain}.json`; }
export function writeObservation(ns, domain, producer, status, data, options = {}) {
    const now = Date.now();
    const value = {
        schemaVersion: 1, kind: "observation-snapshot", domain, producer,
        collectedAt: now, freshUntil: now + (options.freshForMs ?? 15_000),
        status, reason: options.reason ?? null, data,
    };
    ns.write(snapshotPath(domain), JSON.stringify(value, null, 2), "w");
    return value;
}
export function readJson(ns, path, fallback) {
    try { return JSON.parse(ns.read(path)); } catch { return fallback; }
}
export function appendBounded(ns, path, sample, limit = 240) {
    const prior = readJson(ns, path, { schemaVersion: 1, samples: [] });
    const samples = [...(Array.isArray(prior.samples) ? prior.samples : []), sample].slice(-limit);
    ns.write(path, JSON.stringify({ schemaVersion: 1, updatedAt: Date.now(), samples }), "w");
}
