import { claimKey, directAuthorization, validAuthorityState, validClaim } from "./authority.js";
import { PORTS } from "./ports.js";

export const WORK_ORDER_SCHEMA_VERSION=1;
export const WORK_ORDER_STATE_PATH="data/control/work-orders.json";
export const WORK_ORDER_MIN_TTL_MS=1000;
export const WORK_ORDER_MAX_TTL_MS=300000;
export const CLEANUP_MIN_TTL_MS=500;
export const CLEANUP_MAX_TTL_MS=10000;
export const CLEANUP_DEFAULT_TTL_MS=3000;
export const WORK_ORDER_STATES=Object.freeze(["PENDING","ACTIVE","CLOSING","CLOSED","FAILED","CANCELLED"]);

export function workOrder({workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints=null,createdAt=Date.now()}){
    return {schemaVersion:1,kind:"work-order",workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints,state:"PENDING",createdAt,updatedAt:createdAt,expiresAt:null,cleanupTtlMs:CLEANUP_DEFAULT_TTL_MS,cleanupExpiresAt:null,closeReason:null};
}
export function validWorkOrder(v){
    return Boolean(v&&v.schemaVersion===1&&v.kind==="work-order"
        &&typeof v.workOrderId==="string"&&v.workOrderId&&typeof v.issuer==="string"&&v.issuer&&typeof v.receiver==="string"&&v.receiver
        &&typeof v.objective==="string"&&v.objective&&Array.isArray(v.claims)&&v.claims.length>0&&v.claims.every(validClaim)
        &&typeof v.authorityLeaseId==="string"&&v.authorityLeaseId&&typeof v.correlationId==="string"&&v.correlationId
        &&WORK_ORDER_STATES.includes(v.state)&&Number.isFinite(v.createdAt)&&Number.isFinite(v.updatedAt)
        &&Number.isFinite(v.cleanupTtlMs)&&v.cleanupTtlMs>=CLEANUP_MIN_TTL_MS&&v.cleanupTtlMs<=CLEANUP_MAX_TTL_MS);
}
export function delegatedAuthorizationContext(order){
    if(!validWorkOrder(order))return null;
    return {mode:"DELEGATED",authorityLeaseId:order.authorityLeaseId,workOrderId:order.workOrderId,issuer:order.issuer,delegate:order.receiver,correlationId:order.correlationId};
}
export function createWorkOrder({requestId,workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints=null,ttlMs,cleanupTtlMs=CLEANUP_DEFAULT_TTL_MS,at=Date.now()}){
    return {schemaVersion:1,kind:"work-order-command",action:"create",requestId,workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints,ttlMs,cleanupTtlMs,at};
}
export function closeWorkOrder({requestId,workOrderId,actor,at=Date.now()}){return {schemaVersion:1,kind:"work-order-command",action:"close",requestId,workOrderId,actor,at};}
export function completeWorkOrder({requestId,workOrderId,actor,at=Date.now()}){return {schemaVersion:1,kind:"work-order-command",action:"complete",requestId,workOrderId,actor,at};}
export function cancelWorkOrder({requestId,workOrderId,actor,at=Date.now()}){return {schemaVersion:1,kind:"work-order-command",action:"cancel",requestId,workOrderId,actor,at};}
export function publishWorkOrderCommand(ns,command){return ns.tryWritePort(PORTS.WORK_ORDERS,JSON.stringify(command))===true;}
export function validWorkOrderCommand(v){
    if(!v||v.schemaVersion!==1||v.kind!=="work-order-command"||!["create","close","complete","cancel"].includes(v.action))return false;
    if(typeof v.requestId!=="string"||!v.requestId||typeof v.workOrderId!=="string"||!v.workOrderId||!Number.isFinite(v.at))return false;
    if(v.action!=="create")return typeof v.actor==="string"&&v.actor.length>0;
    return typeof v.issuer==="string"&&v.issuer.length>0&&typeof v.receiver==="string"&&v.receiver.length>0&&typeof v.objective==="string"&&v.objective.length>0
        &&Array.isArray(v.claims)&&v.claims.length>0&&v.claims.every(validClaim)&&new Set(v.claims.map(claimKey)).size===v.claims.length
        &&typeof v.authorityLeaseId==="string"&&v.authorityLeaseId.length>0&&typeof v.correlationId==="string"&&v.correlationId.length>0
        &&Number.isFinite(v.ttlMs)&&v.ttlMs>=WORK_ORDER_MIN_TTL_MS&&v.ttlMs<=WORK_ORDER_MAX_TTL_MS
        &&Number.isFinite(v.cleanupTtlMs)&&v.cleanupTtlMs>=CLEANUP_MIN_TTL_MS&&v.cleanupTtlMs<=CLEANUP_MAX_TTL_MS;
}
export function validWorkOrderState(v){return Boolean(v&&v.schemaVersion===1&&v.kind==="work-order-state"&&v.owner==="work-order-service"&&Array.isArray(v.orders)&&Array.isArray(v.decisions));}
export function delegatedAuthorization(authorityState,workOrderState,{workOrderId,receiver,claim,at=Date.now()}){
    if(!validAuthorityState(authorityState))return deny("invalid-authority-state");
    if(!validWorkOrderState(workOrderState))return deny("invalid-work-order-state");
    if(!validClaim(claim))return deny("invalid-claim");
    if(!Number.isFinite(at))return deny("invalid-time");
    const order=workOrderState.orders.find(x=>x.workOrderId===workOrderId);
    if(!order)return deny("work-order-not-found");
    if(order.state!=="ACTIVE")return deny("work-order-not-active");
    if(order.receiver!==receiver)return deny("receiver-mismatch");
    if(!Number.isFinite(order.expiresAt)||order.expiresAt<=at)return deny("work-order-expired");
    if(!order.claims.some(x=>claimKey(x)===claimKey(claim)))return deny("claim-not-delegated");
    const parent=authorityState.leases.find(x=>x.leaseId===order.authorityLeaseId);
    if(!parent)return deny("parent-authority-not-found");
    if(parent.owner!==order.issuer)return deny("issuer-no-longer-owner");
    if(parent.correlationId!==order.correlationId)return deny("correlation-mismatch");
    const direct=directAuthorization(authorityState,{leaseId:parent.leaseId,owner:order.issuer,claim,at});
    if(!direct.authorized)return deny("parent-authority-invalid");
    return {authorized:true,mode:"DELEGATED",reason:"authorized",workOrderId:order.workOrderId,authorityLeaseId:parent.leaseId,issuer:order.issuer,delegate:receiver,correlationId:order.correlationId,expiresAt:Math.min(order.expiresAt,parent.expiresAt)};
}
export function cleanupAuthorization(workOrderState,{workOrderId,receiver,claim,at=Date.now()}){
    if(!validWorkOrderState(workOrderState)||!validClaim(claim)||!Number.isFinite(at))return deny("invalid-cleanup-state");
    const order=workOrderState.orders.find(x=>x.workOrderId===workOrderId);
    if(!order)return deny("work-order-not-found");
    if(order.state!=="CLOSING")return deny("work-order-not-closing");
    if(order.receiver!==receiver)return deny("receiver-mismatch");
    if(!order.claims.some(x=>claimKey(x)===claimKey(claim)))return deny("claim-not-in-original-scope");
    if(!Number.isFinite(order.cleanupExpiresAt)||order.cleanupExpiresAt<=at)return deny("cleanup-expired");
    return {authorized:true,mode:"CLEANUP",reason:"bounded-cleanup",workOrderId:order.workOrderId,authorityLeaseId:order.authorityLeaseId,issuer:order.issuer,delegate:receiver,correlationId:order.correlationId,closeReason:order.closeReason,expiresAt:order.cleanupExpiresAt};
}
function deny(reason){return {authorized:false,mode:"DENIED",reason};}
