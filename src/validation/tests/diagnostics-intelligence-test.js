import { diagnosticReport, diagnosticResolve, publishDiagnostic, DIAGNOSTICS_STATE_PATH, validDiagnosticsState } from "../../core/diagnostics.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";
export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.diagnostics.intelligence"),startedAt=Date.now(),assertions=[];
    const version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
    const id="validation:diagnostics-safe";
    const report=diagnosticReport({id,source:"validation",code:"SYNTHETIC_DIAGNOSTIC",message:"Synthetic diagnostic evidence for SAFE validation.",severity:"warning",classification:"OBSERVED",confidence:"high",correlationId:"validation:diagnostics",evidence:[{type:"validation",summary:"Known synthetic evidence; no production service was disrupted."}]});
    check(assertions,"report-published",publishDiagnostic(ns,report),"Synthetic structured diagnostic report was accepted by the bounded ingress port.");
    let first=await wait(ns,id,"active",3000);
    check(assertions,"durable-incident",validDiagnosticsState(first.state)&&Boolean(first.incident),"Diagnostics owner persisted the synthetic incident.");
    check(assertions,"evidence-classification",first.incident?.classification==="OBSERVED"&&first.incident?.confidence==="high"&&first.incident?.evidence?.[0]?.type==="validation","Incident preserves evidence classification, confidence, and supplied evidence.");
    publishDiagnostic(ns,{...report,at:Date.now()});
    await ns.sleep(800);
    const second=read(ns,DIAGNOSTICS_STATE_PATH),matches=(second?.incidents??[]).filter(x=>x.id===id);
    check(assertions,"deduplicated",matches.length===1,"Repeated reports retain one incident identity rather than flooding diagnostic state.");
    check(assertions,"occurrence-bounded",matches[0]?.occurrences===1,"Identical repeated observations refresh last-seen time without falsely counting a new failure occurrence.");
    check(assertions,"resolve-published",publishDiagnostic(ns,diagnosticResolve(id,"validation")),"Resolution command was accepted.");
    const resolved=await wait(ns,id,"resolved",3000);
    check(assertions,"resolved",resolved.incident?.status==="resolved"&&Number.isFinite(resolved.incident?.resolvedAt),"Incident can be explicitly resolved without deleting its evidence.");
    const status=assertions.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=assertions.filter(x=>x.pass).length+"/"+assertions.length+" assertions passed.";
    ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions,summary},null,2),"w");
    const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
async function wait(ns,id,status,timeout){const end=Date.now()+timeout;while(Date.now()<end){const state=read(ns,DIAGNOSTICS_STATE_PATH),incident=(state?.incidents??[]).find(x=>x.id===id);if(incident?.status===status)return{state,incident};await ns.sleep(100);}const state=read(ns,DIAGNOSTICS_STATE_PATH);return{state,incident:(state?.incidents??[]).find(x=>x.id===id)};}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
