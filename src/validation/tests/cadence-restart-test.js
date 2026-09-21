import { cadenceRequest, publishCadenceCommand, readCadenceState } from "../../core/collection-control.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";
const SERVICE="src/core/collection-control-service.js";
const OBS="data/observations/player.json";
export async function main(ns){
 ns.disableLog("ALL");
 const testId=String(ns.args[0]??"m3.cadence.restart"), startedAt=Date.now(), assertions=[];
 const plan=readValidationPlan(ns), validationVersion=requiredValidationVersion(plan,testId)??1;
 let original=null,restartedPid=0,status="FAIL",summary="Cadence restart recovery did not complete.";
 try{
  original=ns.ps("home").find(p=>p.filename===SERVICE);
  check(assertions,"service-running",Boolean(original),original?`Captured collection-control pid ${original.pid}.`:"Collection-control service is not running.");
  if(!original)throw new Error("Precondition failed: collection-control service is not running.");
  const id=`validation-cadence-restart-${Date.now()}`;
  check(assertions,"request-published",publishCadenceCommand(ns,cadenceRequest("validation-restart","player",100,12000,id)),"Published a 12-second player cadence lease before restart.");
  const active=await waitState(ns,s=>leasePresent(s,id)&&s?.resolved?.player?.intervalMs===500,1500);
  check(assertions,"lease-durable-before-restart",Boolean(active),"Lease is present in durable cadence state and resolved to the 500ms floor.");
  if(!active)throw new Error("Precondition failed: lease did not become durable before restart.");
  if(!ns.kill(original.pid))throw new Error(`Could not stop collection-control pid ${original.pid}.`);
  await ns.sleep(250);
  restartedPid=ns.exec(SERVICE,"home",{threads:original.threads,preventDuplicates:true},...original.args);
  check(assertions,"service-restarted",restartedPid>0,restartedPid?`Collection-control restarted at pid ${restartedPid}.`:"Collection-control restart failed.");
  if(!restartedPid)throw new Error("Collection-control restart failed.");
  const recovered=await waitState(ns,s=>leasePresent(s,id)&&s?.resolved?.player?.intervalMs===500,1500);
  check(assertions,"lease-recovered",Boolean(recovered),"Restarted owner recovered the unexpired durable lease and retained the 500ms bounded resolution.");
  const boundary=await waitNextObservation(ns,3000);
  const accelerated=boundary?await captureIntervals(ns,2,2000):[];
  check(assertions,"accelerated-after-restart",accelerated.length>=2&&accelerated.every(ms=>ms<=900),`Observed post-restart accelerated player interval(s): ${accelerated.join(", ")||"insufficient samples"} ms.`);
  const expired=await waitState(ns,s=>!leasePresent(s,id)&&s?.resolved?.player?.activeLeaseCount===0&&s.resolved.player.intervalMs===2000,12000);
  check(assertions,"expires-after-restart",Boolean(expired),"Recovered lease expired normally and durable resolution returned to 2000ms baseline.");
  const expiryBoundary=await waitNextObservation(ns,3000);
  const baseline=expiryBoundary?await captureIntervals(ns,1,3500):[];
  check(assertions,"baseline-after-expiry",baseline.length>=1&&baseline.every(ms=>ms>=1500),`Observed post-expiry player interval: ${baseline.join(", ")||"insufficient samples"} ms.`);
  status=assertions.every(x=>x.pass)?"PASS":"FAIL";
  summary=status==="PASS"?"Collection-control restarted, recovered the durable live lease, and expired it back to baseline.":"One or more cadence restart assertions failed.";
 }catch(error){summary=String(error?.message??error);}
 finally{
  if(!ns.ps("home").some(p=>p.filename===SERVICE))restartedPid=ns.exec(SERVICE,"home",{threads:original?.threads??1,preventDuplicates:true},...(original?.args??[]));
  const finishedAt=Date.now(), result={schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions,summary};
  ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
  const record=evidenceRecord({testId,validationVersion,status,kind:"automated",summary,assertions,at:finishedAt});
  appendEvidence(ns,record);recordValidationResult(ns,{testId,validationVersion,status,evidenceId:record.id,kind:record.kind,summary:record.summary,at:finishedAt});
 }
}
function leasePresent(state,id){return Boolean(state?.leases?.some(x=>x.id===id&&x.expiresAt>Date.now()));}
async function waitState(ns,predicate,timeout){const end=Date.now()+timeout;do{const s=readCadenceState(ns);if(predicate(s))return s;await ns.sleep(50);}while(Date.now()<end);return null;}
async function waitNextObservation(ns,timeout){const end=Date.now()+timeout,start=read(ns,OBS)?.observedAt;while(Date.now()<end){await ns.sleep(50);const at=read(ns,OBS)?.observedAt;if(Number.isFinite(at)&&at!==start)return at;}return null;}
async function captureIntervals(ns,count,timeout){const out=[],end=Date.now()+timeout;let last=read(ns,OBS)?.observedAt;while(Date.now()<end&&out.length<count){await ns.sleep(50);const at=read(ns,OBS)?.observedAt;if(Number.isFinite(at)&&Number.isFinite(last)&&at!==last){out.push(at-last);last=at;}else if(Number.isFinite(at)&&!Number.isFinite(last))last=at;}return out;}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
