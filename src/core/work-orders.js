import { validClaim } from "./authority.js";

export const WORK_ORDER_SCHEMA_VERSION=1;
export const WORK_ORDER_STATES=Object.freeze(["PENDING","ACTIVE","CLOSING","CLOSED","FAILED","CANCELLED"]);

export function workOrder({workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints=null,createdAt=Date.now()}){
    return {schemaVersion:1,kind:"work-order",workOrderId,issuer,receiver,objective,claims,authorityLeaseId,correlationId,constraints,state:"PENDING",createdAt,updatedAt:createdAt};
}
export function validWorkOrder(v){
    return Boolean(v&&v.schemaVersion===1&&v.kind==="work-order"
        &&typeof v.workOrderId==="string"&&v.workOrderId
        &&typeof v.issuer==="string"&&v.issuer
        &&typeof v.receiver==="string"&&v.receiver
        &&typeof v.objective==="string"&&v.objective
        &&Array.isArray(v.claims)&&v.claims.length>0&&v.claims.every(validClaim)
        &&typeof v.authorityLeaseId==="string"&&v.authorityLeaseId
        &&typeof v.correlationId==="string"&&v.correlationId
        &&WORK_ORDER_STATES.includes(v.state)
        &&Number.isFinite(v.createdAt)&&Number.isFinite(v.updatedAt));
}
export function delegatedAuthorizationContext(order){
    if(!validWorkOrder(order))return null;
    return {mode:"DELEGATED",authorityLeaseId:order.authorityLeaseId,workOrderId:order.workOrderId,issuer:order.issuer,delegate:order.receiver,correlationId:order.correlationId};
}
