import { observationPort } from "./ports.js";
import { wallNow } from "./time.js";

export const OBSERVATION_ROOT = "data/observations";
export function snapshotPath(domain) { return `${OBSERVATION_ROOT}/${domain}.json`; }

export function writeObservation(ns, domain, producer, availability, data, options = {}) {
    const value = {
        schemaVersion: 2,
        kind: "observation",
        domain,
        producer,
        observedAt: options.observedAt ?? wallNow(),
        availability,
        reason: options.reason ?? null,
        data,
    };
    ns.write(snapshotPath(domain), JSON.stringify(value, null, 2), "w");
    const published = ns.tryWritePort(observationPort(domain), JSON.stringify(value)) === true;
    return { value, published };
}

export function readJson(ns, path, fallback) {
    try { return JSON.parse(ns.read(path)); } catch { return fallback; }
}

export function appendBounded(ns, path, sample, limit = 240) {
    const prior = readJson(ns, path, { schemaVersion: 1, samples: [] });
    const samples = [...(Array.isArray(prior.samples) ? prior.samples : []), sample].slice(-limit);
    ns.write(path, JSON.stringify({ schemaVersion: 1, updatedAt: wallNow(), samples }), "w");
}
