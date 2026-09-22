import { PORTS } from "./ports.js";

export const BUDGET_STATE_PATH="data/control/resource-budgets.json";
export const BUDGET_SCHEMA_VERSION=1;
export const BUDGET_DECISION_LIMIT=80;
export const RAM_BUDGET_MIN_GB=0.01;
export const RAM_BUDGET_MAX_GB=1048576;

export function setRamBudget({requestId,allocationId,owner,limitGb,correlationId=null,at=Date.now()}){
    return {schemaVersion:1,kind:"resource-budget-command",action:"set-ram",requestId,allocationId,owner,limitGb,correlationId,at};
}
export function releaseRamBudget({requestId,allocationId,owner,at=Date.now()}){
    return {schemaVersion:1,kind:"resource-budget-command",action:"release-ram",requestId,allocationId,owner,at};
}
export function publishBudgetCommand(ns,command){
    return ns.tryWritePort(PORTS.RESOURCE_BUDGETS,JSON.stringify(command))===true;
}
export function validBudgetCommand(v){
    if(!v||v.schemaVersion!==1||v.kind!=="resource-budget-command"||!["set-ram","release-ram"].includes(v.action))return false;
    if(typeof v.requestId!=="string"||!v.requestId||typeof v.allocationId!=="string"||!v.allocationId||typeof v.owner!=="string"||!v.owner||!Number.isFinite(v.at))return false;
    if(v.action==="release-ram")return true;
    return Number.isFinite(v.limitGb)&&v.limitGb>=RAM_BUDGET_MIN_GB&&v.limitGb<=RAM_BUDGET_MAX_GB&&(v.correlationId===null||typeof v.correlationId==="string");
}
export function validBudgetState(v){
    return Boolean(v&&v.schemaVersion===BUDGET_SCHEMA_VERSION&&v.kind==="resource-budget-state"&&v.owner==="resource-budget-manager"&&Array.isArray(v.ramAllocations)&&Array.isArray(v.decisions));
}
export function ramBudgetFor(state,owner){
    if(!validBudgetState(state)||typeof owner!=="string"||!owner)return null;
    return state.ramAllocations.find(x=>x.owner===owner)??null;
}
