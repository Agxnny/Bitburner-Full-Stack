import { cadenceRequest, publishCadenceCommand, readCadenceState } from "../../core/collection-control.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json", OBS="data/observations/player.json";
export async function main(ns){
 ns.disableLog("ALL"); const testId=String(ns.args[0]??"m3.cadence.control"), startedAt=Date.now(), assertions=[];
 const plan=readValidationPlan(ns), validationVersion=requiredValidationVersion(plan,testId)??1;
 const health=read(ns,"data/telemetry/health.json");
 check(assertions,"control-service",Boolean(health?.services?.some(s=>s.service==="collection-control"&&s.health==="healthy")),"Collection-control service reports healthy.");
 const id=`validation-cadence-${Date.now()}`, command=cadenceRequest("validation", "player", 100, 4500, id);
 check(assertions,"request-published",publishCadenceCommand(ns,command),"Short-lived player cadence lease was published.");
 const active=await waitState(ns,s=>s?.resolved?.player?.activeLeaseCount===1&&s.resolved.player.intervalMs===500,1500);
 check(assertions,"bounded-floor",Boolean(active),"100ms request resolved to the player collector 500ms minimum.");
 const accelerated=await captureIntervals(ns,3,3500);
 check(assertions,"accelerated",accelerated.length>=2&&accelerated.every(ms=>ms<=900),`Observed accelerated player intervals: ${accelerated.join(", ")||"insufficient samples"} ms.`);
 const expired=await waitState(ns,s=>s?.resolved?.player?.activeLeaseCount===0&&s.resolved.player.intervalMs===2000,2500);
 check(assertions,"lease-expiry",Boolean(expired),"Lease expired automatically and resolved cadence returned to 2000ms baseline.");
 const baseline=await captureIntervals(ns,2,5000);
 check(assertions,"baseline-restored",baseline.length>=1&&baseline.every(ms=>ms>=1500),`Observed restored player interval(s): ${baseline.join(", ")||"insufficient samples"} ms.`);
 const status=assertions.every(x=>x.pass)?"PASS":"FAIL", finishedAt=Date.now();
 const result={schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions}; ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
 const record=evidenceRecord({testId,validationVersion,status,kind:"automated",summary:`${assertions.filter(x=>x.pass).length}/${assertions.length} assertions passed.`,assertions,at:finishedAt});
 appendEvidence(ns,record); recordValidationResult(ns,{testId,validationVersion,status,evidenceId:record.id,kind:record.kind,summary:record.summary,at:finishedAt});
}
async function waitState(ns,predicate,timeout){const end=Date.now()+timeout;do{const s=readCadenceState(ns);if(predicate(s))return s;await ns.sleep(50);}while(Date.now()<end);return null;}
async function captureIntervals(ns,count,timeout){const out=[],end=Date.now()+timeout;let last=read(ns,OBS)?.observedAt;while(Date.now()<end&&out.length<count){await ns.sleep(50);const at=read(ns,OBS)?.observedAt;if(Number.isFinite(at)&&Number.isFinite(last)&&at!==last){out.push(at-last);last=at;}else if(Number.isFinite(at)&&!Number.isFinite(last))last=at;}return out;}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
