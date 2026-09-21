import { PORTS } from "./ports.js";

export const DIAGNOSTICS_STATE_PATH = "data/diagnostics/incidents.json";
export const DIAGNOSTIC_SCHEMA_VERSION = 1;
export const DIAGNOSTIC_CLASSES = Object.freeze(["OBSERVED","CORRELATED","INFERRED"]);
export const DIAGNOSTIC_SEVERITIES = Object.freeze(["warning","error"]);

export function diagnosticReport({id,source,code,message,severity="warning",classification="OBSERVED",confidence="high",correlationId=null,evidence=[],details=null,at=Date.now()}){
    return {schemaVersion:1,kind:"diagnostic-command",action:"report",id,source,code,message,severity,classification,confidence,correlationId,evidence,details,at};
}
export function diagnosticResolve(id,source,at=Date.now()){
    return {schemaVersion:1,kind:"diagnostic-command",action:"resolve",id,source,at};
}
export function publishDiagnostic(ns,command){
    return ns.tryWritePort(PORTS.DIAGNOSTICS,JSON.stringify(command))===true;
}
export function validDiagnosticCommand(v){
    if(!v||v.schemaVersion!==1||v.kind!=="diagnostic-command"||!["report","resolve"].includes(v.action))return false;
    if(typeof v.id!=="string"||!v.id||typeof v.source!=="string"||!v.source||!Number.isFinite(v.at))return false;
    if(v.action==="resolve")return true;
    return typeof v.code==="string"&&v.code.length>0&&typeof v.message==="string"&&v.message.length>0
        &&DIAGNOSTIC_SEVERITIES.includes(v.severity)&&DIAGNOSTIC_CLASSES.includes(v.classification)
        &&["low","medium","high"].includes(v.confidence)&&Array.isArray(v.evidence);
}
export function validDiagnosticsState(v){
    return Boolean(v&&v.schemaVersion===DIAGNOSTIC_SCHEMA_VERSION&&v.kind==="diagnostics-state"&&v.owner==="diagnostics-service"&&Array.isArray(v.incidents));
}
