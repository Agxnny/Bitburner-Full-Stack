import { wallNow } from "./time.js";

export const CANONICAL_STATE_ROOT = "data/state";
export const OBSERVATION_DOMAINS = Object.freeze(["player", "network", "market", "infrastructure", "capabilities"]);
export const CANONICAL_DOMAINS = Object.freeze([...OBSERVATION_DOMAINS, "associations"]);

export function canonicalStatePath(domain) {
    return `${CANONICAL_STATE_ROOT}/${domain}.json`;
}

export function canonicalEnvelope(observation, revision, canonicalizedAt = wallNow()) {
    return {
        schemaVersion: 1,
        kind: "canonical-state",
        domain: observation.domain,
        revision,
        observedAt: observation.observedAt,
        canonicalizedAt,
        producer: observation.producer,
        availability: observation.availability,
        reason: observation.reason ?? null,
        data: observation.data,
    };
}

export function validObservation(value) {
    return Boolean(
        value
        && value.schemaVersion === 2
        && value.kind === "observation"
        && CANONICAL_DOMAINS.includes(value.domain)
        && typeof value.producer === "string"
        && value.producer.length > 0
        && Number.isFinite(value.observedAt)
        && ["available", "unavailable"].includes(value.availability)
        && Object.hasOwn(value, "data"),
    );
}

export function validCanonicalState(value) {
    return Boolean(
        value
        && value.schemaVersion === 1
        && value.kind === "canonical-state"
        && CANONICAL_DOMAINS.includes(value.domain)
        && Number.isSafeInteger(value.revision)
        && value.revision > 0
        && Number.isFinite(value.observedAt)
        && Number.isFinite(value.canonicalizedAt)
        && value.canonicalizedAt >= value.observedAt
        && ["available", "unavailable"].includes(value.availability),
    );
}
