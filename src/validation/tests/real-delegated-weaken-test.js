import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { WORK_ORDER_STATE_PATH, closeWorkOrder, completeWorkOrder, createWorkOrder, publishWorkOrderCommand } from "../../core/work-orders.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json", EXECUTOR="src/validation/fixtures/delegated-weaken-executor.js";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.authority.real-weaken"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-real-weaken-"+startedAt,issuer=tag+":controller",receiver=tag+":executor",leaseId=tag+":lease",orderId=tag+":order",resultPath="data/validation/"+tag+"-result.json";let target=null,pid=0;
 try{
  target=chooseTarget(ns,read(ns,"data/state/network.json"),ns.getHackingLevel());
  check(a,"target-selected",Boolean(target),target?"Selected rooted non-purchased target "+target.hostname+" with security above minimum.":"No safe eligible target.");
  if(!target)throw new Error("No eligible weaken target.");
  const weakenMs=ns.getWeakenTime(target.hostname), marginMs=15000;
  const leaseTtlMs=Math.min(290000,Math.ceil(weakenMs+marginMs));
  const orderTtlMs=Math.min(leaseTtlMs-5000,Math.ceil(weakenMs+10000));
  const claim=authorityClaim("server",target.hostname,"hacking-control");
  auth(ns,acquireAuthority({requestId:tag+":grant",leaseId,owner:issuer,intent:"validation-real-weaken",claims:[claim],ttlMs:leaseTtlMs,correlationId:tag}));
  const grant=await authDecision(ns,tag+":grant",4000);check(a,"authority-granted",grant?.outcome==="GRANTED","Controller obtained real hacking-control authority.");if(grant?.outcome!=="GRANTED")throw new Error("Authority grant denied.");
  wo(ns,createWorkOrder({requestId:tag+":create",workOrderId:orderId,issuer,receiver,objective:"weaken-once",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,constraints:{operation:"weaken",threads:1,target:target.hostname},ttlMs:orderTtlMs,cleanupTtlMs:3000}));
  const created=await woDecision(ns,tag+":create",4000);check(a,"work-order-active",created?.outcome==="GRANTED"&&findOrder(ns,orderId)?.state==="ACTIVE","Controller issued one bounded ACTIVE weaken Work Order.");if(created?.outcome!=="GRANTED")throw new Error("Work Order creation denied.");
  ns.rm(resultPath,"home");pid=ns.exec(EXECUTOR,"home",1,orderId,receiver,target.hostname,resultPath);check(a,"executor-started",pid>0,"Started one-thread temporary delegated executor on home at pid "+pid+".");if(pid<=0)throw new Error("Executor failed to start.");
  const result=await wait(ns,()=>read(ns,resultPath),Math.ceil(weakenMs+8000));
  check(a,"delegated-execution",result?.status==="COMPLETED"&&result?.authorization?.mode==="DELEGATED",result?.status==="COMPLETED"?"Executor with no direct lease passed DELEGATED authorization immediately before weaken.":"Executor authorization denied: "+(result?.authorization?.reason??"no executor result")+".");
  check(a,"real-weaken",Number.isFinite(result?.before)&&Number.isFinite(result?.after)&&result.after<result.before,Number.isFinite(result?.before)&&Number.isFinite(result?.after)?"Real weaken changed security from "+result.before+" to "+result.after+".":"Real weaken did not produce before/after evidence; executor status="+(result?.status??"missing")+".");
  wo(ns,closeWorkOrder({requestId:tag+":close",workOrderId:orderId,actor:issuer}));await woDecision(ns,tag+":close",4000);
  wo(ns,completeWorkOrder({requestId:tag+":complete",workOrderId:orderId,actor:receiver}));await woDecision(ns,tag+":complete",4000);
  check(a,"order-closed",findOrder(ns,orderId)?.state==="CLOSED","Completed action drained through CLOSING to CLOSED.");
  auth(ns,releaseAuthority({requestId:tag+":release",leaseId,owner:issuer}));await authDecision(ns,tag+":release",4000);
  if(pid>0&&ns.isRunning(pid,"home"))ns.kill(pid);
  await wait(ns,()=>pid<=0||!ns.isRunning(pid,"home"),2000);await ns.sleep(250);
  check(a,"cleanup-clean",!read(ns,AUTHORITY_STATE_PATH)?.leases?.some(x=>x.leaseId===leaseId)&&findOrder(ns,orderId)?.state==="CLOSED"&&(pid<=0||!ns.isRunning(pid,"home")),"No live test lease or executor remains; Work Order is terminal CLOSED.");
 }catch(error){check(a,"fixture-error",false,String(error?.message??error));}
 finally{
  if(pid>0&&ns.isRunning(pid,"home"))ns.kill(pid);
  wo(ns,closeWorkOrder({requestId:tag+":finally-close",workOrderId:orderId,actor:issuer}));await ns.sleep(250);
  if(findOrder(ns,orderId)?.state==="CLOSING"){wo(ns,completeWorkOrder({requestId:tag+":finally-complete",workOrderId:orderId,actor:receiver}));await ns.sleep(250);}
  auth(ns,releaseAuthority({requestId:tag+":finally-release",leaseId,owner:issuer}));await ns.sleep(300);ns.rm(resultPath,"home");
 }
 const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary,target:target?.hostname??null},null,2),"w");
 const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function chooseTarget(ns,network,hackingLevel){if(!network||network.kind!=="canonical-state"||network.domain!=="network"||network.availability!=="available"||!Array.isArray(network.data?.servers))return null;return network.data.servers.filter(s=>s.hostname!=="home"&&s.hasAdminRights&&!s.purchasedByPlayer&&s.isOnline!==false&&s.requiredHackingSkill<=hackingLevel&&Number.isFinite(s.hackDifficulty)&&Number.isFinite(s.minDifficulty)&&s.hackDifficulty>s.minDifficulty+0.0001&&ns.getWeakenTime(s.hostname)<=270000).sort((a,b)=>ns.getWeakenTime(a.hostname)-ns.getWeakenTime(b.hostname)||(b.hackDifficulty-b.minDifficulty)-(a.hackDifficulty-a.minDifficulty)||a.hostname.localeCompare(b.hostname))[0]??null;}
function auth(ns,c){if(!publishAuthorityCommand(ns,c))throw new Error("Authority command queue full.");} function wo(ns,c){if(!publishWorkOrderCommand(ns,c))throw new Error("Work Order command queue full.");}
async function authDecision(ns,id,t){return wait(ns,()=>read(ns,AUTHORITY_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function woDecision(ns,id,t){return wait(ns,()=>read(ns,WORK_ORDER_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);}
async function wait(ns,get,t){const end=Date.now()+t;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;} function findOrder(ns,id){return read(ns,WORK_ORDER_STATE_PATH)?.orders?.find(x=>x.workOrderId===id);}
function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});} function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
