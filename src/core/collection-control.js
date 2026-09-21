import { PORTS } from "./ports.js";

export const COLLECTION_CONTROL_STATE_PATH = "data/control/collection-cadence.json";
export const COLLECTION_CONTROL_SCHEMA_VERSION = 1;
export const CADENCE_DOMAINS = ["player","network","market","infrastructure","capabilities"];

export function cadenceRequest(owner, domain, intervalMs, ttlMs, id = null) {
    const now=Date.now();
    return {schemaVersion:1,kind:"cadence-lease",action:"upsert",id:id??`${owner}:${domain}`,owner,domain,intervalMs,createdAt:now,expiresAt:now+ttlMs};
}
export function cadenceRelease(owner, domain, id = null) {
    return {schemaVersion:1,kind:"cadence-lease",action:"release",id:id??`${owner}:${domain}`,owner,domain,createdAt:Date.now()};
}
export function publishCadenceCommand(ns, command) {
    return ns.tryWritePort(PORTS.COLLECTION_CONTROL, JSON.stringify(command))===true;
}
export function readCadenceState(ns) {
    try { const value=JSON.parse(ns.read(COLLECTION_CONTROL_STATE_PATH)); return validCadenceState(value)?value:null; } catch { return null; }
}
export function resolvedInterval(ns, domain, baselineMs, minimumMs) {
    const state=readCadenceState(ns), resolved=state?.resolved?.[domain];
    if(!resolved || !Number.isFinite(resolved.intervalMs)) return baselineMs;
    return Math.max(minimumMs, Math.min(baselineMs, resolved.intervalMs));
}
export function validCadenceCommand(value) {
    if(!value||value.schemaVersion!==1||value.kind!=="cadence-lease"||!["upsert","release"].includes(value.action))return false;
    if(typeof value.id!=="string"||!value.id||typeof value.owner!=="string"||!value.owner||!CADENCE_DOMAINS.includes(value.domain))return false;
    if(value.action==="release")return true;
    return Number.isFinite(value.intervalMs)&&value.intervalMs>=100&&Number.isFinite(value.expiresAt)&&value.expiresAt>Date.now();
}
export function validCadenceState(value) {
    return Boolean(value&&value.schemaVersion===COLLECTION_CONTROL_SCHEMA_VERSION&&value.kind==="collection-cadence-state"&&value.owner==="collection-control"&&value.resolved&&Array.isArray(value.leases));
}
