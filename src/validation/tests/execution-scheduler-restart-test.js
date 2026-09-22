import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { createWorkOrder, closeWorkOrder, completeWorkOrder, publishWorkOrderCommand, WORK_ORDER_STATE_PATH } from "../../core/work-orders.js";
import { EXECUTION_STATE_PATH, publishExecutionCommand, requestExecution } from "../../core/execution-scheduler.js";
import { BUDGET_STATE_PATH, publishBudgetCommand, releaseRamBudget, setRamBudget } from "../../core/resource-budgets.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json", SERVICE="src/core/execution-scheduler-service.js", FIXTURE="src/validation/fixtures/execution-scheduler-fixture.js";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.execution.restart"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-exec-restart-"+startedAt,issuer=tag+":controller",receiver=tag+":executor",leaseId=tag+":authority",orderId=tag+":order",executionId=tag+":execution",claim=authorityClaim("validation-resource",tag,"validation-execute");
 let originalService=null,restartedPid=0,fixturePid=0;
 try{
  const serviceProc=ns.ps("home").find(p=>p.filename===SERVICE);check(a,"service-running",Boolean(serviceProc),"Execution Scheduler is running before controlled restart.");if(!serviceProc)throw new Error("Execution Scheduler not running.");
  originalService={pid:serviceProc.pid,threads:serviceProc.threads,args:serviceProc.args};
  auth(ns,acquireAuthority({requestId:tag+":grant",leaseId,owner:issuer,intent:"execution-restart-validation",claims:[claim],ttlMs:30000,correlationId:tag}));
  if((await authDecision(ns,tag+":grant",3000))?.outcome!=="GRANTED")throw new Error("Authority grant failed.");
  wo(ns,createWorkOrder({requestId:tag+":order",workOrderId:orderId,issuer,receiver,objective:"run-restart-fixture",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,constraints:{validation:true},ttlMs:20000,cleanupTtlMs:1000}));
  if((await woDecision(ns,tag+":order",3000))?.outcome!=="GRANTED")throw new Error("Work Order failed.");
  budget(ns,setRamBudget({requestId:tag+":budget",allocationId:tag+":ram",owner:receiver,limitGb:4,correlationId:tag}));
  if((await budgetDecision(ns,tag+":budget",3000))?.outcome!=="GRANTED")throw new Error("RAM budget allocation failed.");
  ex(ns,requestExecution({requestId:tag+":run",executionId,workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[6000],ttlMs:15000}));
  if((await exDecision(ns,tag+":run",3000))?.outcome!=="QUEUED")throw new Error("Execution request failed.");
  const before=await wait(ns,()=>{const e=findExecution(ns,executionId);return e?.state==="RUNNING"&&e.pid>0?e:null;},3000);fixturePid=before?.pid??0;
  check(a,"running-before-restart",Boolean(before)&&ns.isRunning(fixturePid,"home"),"Harmless managed fixture is RUNNING before scheduler restart.");
  if(!before)throw new Error("Managed fixture never reached RUNNING.");
  const originalExpiry=before.expiresAt, originalPid=before.pid;
  ns.kill(originalService.pid,"home");await wait(ns,()=>!ns.isRunning(originalService.pid,"home"),2000);
  restartedPid=ns.exec(SERVICE,"home",{threads:originalService.threads,preventDuplicates:true},...originalService.args);
  check(a,"service-restarted",restartedPid>0&&restartedPid!==originalService.pid,"Restarted only execution-scheduler with a new PID.");
  const recovered=await wait(ns,()=>{const e=findExecution(ns,executionId);return e?.state==="RUNNING"&&e.pid===originalPid?e:null;},3000);
  check(a,"exact-pid-recovered",Boolean(recovered)&&ns.isRunning(originalPid,"home"),"Durable RUNNING execution recovered the exact pre-restart child PID.");
  check(a,"expiry-not-extended",recovered?.expiresAt===originalExpiry,"Restart preserved the original absolute execution expiry.");
  const matches=ns.ps("home").filter(p=>p.filename===FIXTURE&&String(p.args?.[0])==="6000");
  check(a,"no-duplicate-launch",matches.length===1&&matches[0].pid===originalPid,"Restart did not launch a duplicate managed fixture.");
  const done=await wait(ns,()=>{const e=findExecution(ns,executionId);return e?.state==="COMPLETE"?e:null;},8000);
  check(a,"completion-after-restart",Boolean(done)&&done.pid===originalPid&&done.terminalReason==="process-exited","Recovered execution naturally completed under its original PID.");
  check(a,"reservation-retired",!["RESERVED","RUNNING","DRAINING"].includes(findExecution(ns,executionId)?.state),"Completed recovered execution no longer reserves RAM.");
 }catch(error){check(a,"fixture-error",false,String(error?.message??error));}
 finally{
  budget(ns,releaseRamBudget({requestId:tag+":budget-release",allocationId:tag+":ram",owner:receiver}));await ns.sleep(250);
  if(fixturePid>0&&ns.isRunning(fixturePid,"home"))ns.kill(fixturePid,"home");
  wo(ns,closeWorkOrder({requestId:tag+":close",workOrderId:orderId,actor:issuer}));await ns.sleep(250);
  if(findOrder(ns,orderId)?.state==="CLOSING"){wo(ns,completeWorkOrder({requestId:tag+":complete",workOrderId:orderId,actor:receiver}));await ns.sleep(250);}
  auth(ns,releaseAuthority({requestId:tag+":release",leaseId,owner:issuer}));await ns.sleep(300);
  if(!ns.ps("home").some(p=>p.filename===SERVICE))restartedPid=ns.exec(SERVICE,"home",{threads:originalService?.threads??1,preventDuplicates:true},...(originalService?.args??[]));
 }
 const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary},null,2),"w");
 const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function budget(ns,c){if(!publishBudgetCommand(ns,c))throw new Error("Budget queue full.");} function auth(ns,c){if(!publishAuthorityCommand(ns,c))throw new Error("Authority queue full.");} function wo(ns,c){if(!publishWorkOrderCommand(ns,c))throw new Error("Work Order queue full.");} function ex(ns,c){if(!publishExecutionCommand(ns,c))throw new Error("Execution queue full.");}
async function budgetDecision(ns,id,t){return wait(ns,()=>read(ns,BUDGET_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function authDecision(ns,id,t){return wait(ns,()=>read(ns,AUTHORITY_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function woDecision(ns,id,t){return wait(ns,()=>read(ns,WORK_ORDER_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function exDecision(ns,id,t){return wait(ns,()=>read(ns,EXECUTION_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);}
function findOrder(ns,id){return read(ns,WORK_ORDER_STATE_PATH)?.orders?.find(x=>x.workOrderId===id);} function findExecution(ns,id){return read(ns,EXECUTION_STATE_PATH)?.executions?.find(x=>x.executionId===id);}
async function wait(ns,get,t){const end=Date.now()+t;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;} function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
