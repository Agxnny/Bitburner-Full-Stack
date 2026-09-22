import { PORTS } from "./ports.js";

export const EXECUTION_STATE_PATH="data/control/execution-scheduler.json";
export const EXECUTION_SCHEMA_VERSION=1;
export const EXECUTION_MIN_TTL_MS=1000;
export const EXECUTION_MAX_TTL_MS=300000;
export const EXECUTION_QUEUE_LIMIT=32;

export function requestExecution({requestId,executionId,workOrderId,receiver,correlationId,script,threads=1,args=[],ttlMs,at=Date.now()}){
    return {schemaVersion:1,kind:"execution-command",action:"request",requestId,executionId,workOrderId,receiver,correlationId,script,threads,args,ttlMs,at};
}
export function cancelExecution({requestId,executionId,actor,at=Date.now()}){
    return {schemaVersion:1,kind:"execution-command",action:"cancel",requestId,executionId,actor,at};
}
export function publishExecutionCommand(ns,command){
    return ns.tryWritePort(PORTS.EXECUTION_SCHEDULER,JSON.stringify(command))===true;
}
export function validExecutionCommand(v){
    if(!v||v.schemaVersion!==1||v.kind!=="execution-command"||!["request","cancel"].includes(v.action))return false;
    if(typeof v.requestId!=="string"||!v.requestId||typeof v.executionId!=="string"||!v.executionId||!Number.isFinite(v.at))return false;
    if(v.action==="cancel")return typeof v.actor==="string"&&v.actor.length>0;
    return typeof v.workOrderId==="string"&&v.workOrderId.length>0
        &&typeof v.receiver==="string"&&v.receiver.length>0
        &&typeof v.correlationId==="string"&&v.correlationId.length>0
        &&typeof v.script==="string"&&v.script.length>0
        &&Number.isSafeInteger(v.threads)&&v.threads>0
        &&Array.isArray(v.args)
        &&Number.isFinite(v.ttlMs)&&v.ttlMs>=EXECUTION_MIN_TTL_MS&&v.ttlMs<=EXECUTION_MAX_TTL_MS;
}
export function validExecutionState(v){
    return Boolean(v&&v.schemaVersion===EXECUTION_SCHEMA_VERSION&&v.kind==="execution-scheduler-state"&&v.owner==="execution-scheduler"&&Array.isArray(v.executions)&&Array.isArray(v.decisions));
}
export function activeExecution(v){return ["RESERVED","RUNNING","DRAINING"].includes(v?.state);}
