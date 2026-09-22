import { PORTS } from "./ports.js";

export const AUTHORITY_STATE_PATH="data/control/authority.json";
export const AUTHORITY_SCHEMA_VERSION=1;
export const AUTHORITY_MIN_TTL_MS=1000;
export const AUTHORITY_MAX_TTL_MS=300000;

export function authorityClaim(kind,id,capability){
    return {resource:{kind:String(kind),id:String(id)},capability:String(capability)};
}
export function claimKey(claim){
    if(!validClaim(claim))return null;
    return claim.resource.kind+":"+claim.resource.id+"|"+claim.capability;
}
export function acquireAuthority({requestId,leaseId,owner,intent,claims,ttlMs,correlationId=null,at=Date.now()}){
    return {schemaVersion:1,kind:"authority-command",action:"acquire",requestId,leaseId,owner,intent,claims,ttlMs,correlationId,at};
}
export function renewAuthority({requestId,leaseId,owner,ttlMs,at=Date.now()}){
    return {schemaVersion:1,kind:"authority-command",action:"renew",requestId,leaseId,owner,ttlMs,at};
}
export function releaseAuthority({requestId,leaseId,owner,at=Date.now()}){
    return {schemaVersion:1,kind:"authority-command",action:"release",requestId,leaseId,owner,at};
}
export function publishAuthorityCommand(ns,command){
    return ns.tryWritePort(PORTS.AUTHORITY,JSON.stringify(command))===true;
}
export function validClaim(v){
    return Boolean(v&&v.resource&&typeof v.resource.kind==="string"&&v.resource.kind.length>0&&typeof v.resource.id==="string"&&v.resource.id.length>0&&typeof v.capability==="string"&&v.capability.length>0);
}
export function validAuthorityCommand(v){
    if(!v||v.schemaVersion!==1||v.kind!=="authority-command"||!["acquire","renew","release"].includes(v.action))return false;
    if(typeof v.requestId!=="string"||!v.requestId||typeof v.leaseId!=="string"||!v.leaseId||typeof v.owner!=="string"||!v.owner||!Number.isFinite(v.at))return false;
    if(v.action==="release")return true;
    if(!Number.isFinite(v.ttlMs)||v.ttlMs<AUTHORITY_MIN_TTL_MS||v.ttlMs>AUTHORITY_MAX_TTL_MS)return false;
    if(v.action==="renew")return true;
    return typeof v.intent==="string"&&v.intent.length>0&&Array.isArray(v.claims)&&v.claims.length>0&&v.claims.every(validClaim)&&new Set(v.claims.map(claimKey)).size===v.claims.length;
}
export function validAuthorityState(v){
    return Boolean(v&&v.schemaVersion===AUTHORITY_SCHEMA_VERSION&&v.kind==="authority-state"&&v.owner==="authority-service"&&Array.isArray(v.leases)&&Array.isArray(v.decisions));
}
export function directAuthorization(state,{leaseId,owner,claim,at=Date.now()}){
    if(!validAuthorityState(state)||!validClaim(claim)||!Number.isFinite(at))return {authorized:false,mode:"DENIED",reason:"invalid-authority-state"};
    const lease=state.leases.find(x=>x.leaseId===leaseId);
    if(!lease)return {authorized:false,mode:"DENIED",reason:"lease-not-found"};
    if(lease.owner!==owner)return {authorized:false,mode:"DENIED",reason:"owner-mismatch"};
    if(!Number.isFinite(lease.expiresAt)||lease.expiresAt<=at)return {authorized:false,mode:"DENIED",reason:"lease-expired"};
    if(!lease.claims.some(x=>claimKey(x)===claimKey(claim)))return {authorized:false,mode:"DENIED",reason:"claim-not-authorized"};
    return {authorized:true,mode:"DIRECT",reason:"authorized",leaseId:lease.leaseId,owner:lease.owner,correlationId:lease.correlationId??null,expiresAt:lease.expiresAt};
}
