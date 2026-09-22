import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { createWorkOrder, closeWorkOrder, completeWorkOrder, publishWorkOrderCommand, WORK_ORDER_STATE_PATH } from "../../core/work-orders.js";
import { EXECUTION_STATE_PATH, publishExecutionCommand, requestExecution } from "../../core/execution-scheduler.js";
import { BUDGET_STATE_PATH, publishBudgetCommand, releaseRamBudget, setRamBudget } from "../../core/resource-budgets.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json", FIXTURE="src/validation/fixtures/execution-scheduler-fixture.js";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.execution.scheduler"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-exec-"+startedAt,issuer=tag+":controller",receiver=tag+":executor",leaseId=tag+":authority",orderId=tag+":order",executionId=tag+":execution",claim=authorityClaim("validation-resource",tag,"validation-execute");
 try{
  budget(ns,setRamBudget({requestId:tag+":budget",allocationId:tag+":ram",owner:receiver,limitGb:4,correlationId:tag}));
  if((await budgetDecision(ns,tag+":budget",3000))?.outcome!=="GRANTED")throw new Error("RAM budget allocation failed.");
  auth(ns,acquireAuthority({requestId:tag+":grant",leaseId,owner:issuer,intent:"execution-scheduler-validation",claims:[claim],ttlMs:30000,correlationId:tag}));
  check(a,"authority", (await authDecision(ns,tag+":grant",3000))?.outcome==="GRANTED","Synthetic parent authority granted.");
  wo(ns,createWorkOrder({requestId:tag+":order",workOrderId:orderId,issuer,receiver,objective:"run-harmless-fixture",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,constraints:{validation:true},ttlMs:20000,cleanupTtlMs:1000}));
  check(a,"work-order", (await woDecision(ns,tag+":order",3000))?.outcome==="GRANTED","Synthetic Work Order ACTIVE.");
  ex(ns,requestExecution({requestId:tag+":bad",executionId:tag+":bad",workOrderId:orderId,receiver:"wrong-receiver",correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[750],ttlMs:10000}));
  check(a,"binding-fails-closed",(await exDecision(ns,tag+":bad",3000))?.reason==="receiver-mismatch","Receiver mismatch denied before execution admission.");
  ex(ns,requestExecution({requestId:tag+":run",executionId,workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[750],ttlMs:10000}));
  const accepted=await exDecision(ns,tag+":run",3000);check(a,"request-accepted",accepted?.outcome==="QUEUED","Valid execution request accepted into bounded scheduler queue.");
  const running=await wait(ns,()=>{const e=findExecution(ns,executionId);return e?.state==="RUNNING"&&e.pid>0&&e.host==="home"?e:null;},3000);
  check(a,"managed-launch",Boolean(running),"Scheduler launched one attributed home process with PID/host/RAM record.");
  ex(ns,requestExecution({requestId:tag+":run",executionId,workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[750],ttlMs:10000}));
  await ns.sleep(300);const decisions=read(ns,EXECUTION_STATE_PATH)?.decisions?.filter(x=>x.requestId===tag+":run")??[];
  check(a,"request-idempotent",decisions.length===1,"Repeated requestId produced no second scheduler decision/execution.");
  const done=await wait(ns,()=>{const e=findExecution(ns,executionId);return e?.state==="COMPLETE"?e:null;},4000);
  check(a,"completion",Boolean(done)&&done.terminalReason==="process-exited","Scheduler observed process exit and made execution terminal COMPLETE.");
  check(a,"reservation-retired",!["RESERVED","RUNNING","DRAINING"].includes(findExecution(ns,executionId)?.state),"Terminal execution no longer reserves RAM.");
 }catch(error){check(a,"fixture-error",false,String(error?.message??error));}
 finally{
  budget(ns,releaseRamBudget({requestId:tag+":budget-release",allocationId:tag+":ram",owner:receiver}));await ns.sleep(250);
  wo(ns,closeWorkOrder({requestId:tag+":close",workOrderId:orderId,actor:issuer}));await ns.sleep(250);
  if(findOrder(ns,orderId)?.state==="CLOSING"){wo(ns,completeWorkOrder({requestId:tag+":complete",workOrderId:orderId,actor:receiver}));await ns.sleep(250);}
  auth(ns,releaseAuthority({requestId:tag+":release",leaseId,owner:issuer}));await ns.sleep(300);
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
