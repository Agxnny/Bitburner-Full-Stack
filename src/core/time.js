/**
 * Shared wall-time contract.
 * Wall time is factual; consumers decide whether timestamped data is fresh enough for their use.
 */
export function wallNow() { return Date.now(); }

export function ageMs(observedAt, now = wallNow()) {
    return Number.isFinite(observedAt) ? Math.max(0, now - observedAt) : null;
}

export function withinWindow(observedAt, startAt, endAt = wallNow()) {
    return Number.isFinite(observedAt)
        && Number.isFinite(startAt)
        && Number.isFinite(endAt)
        && observedAt >= startAt
        && observedAt <= endAt;
}
