import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { createWorkOrder, closeWorkOrder, completeWorkOrder, publishWorkOrderCommand, WORK_ORDER_STATE_PATH } from "../../core/work-orders.js";
import { BUDGET_STATE_PATH, publishBudgetCommand, releaseRamBudget, setRamBudget } from "../../core/resource-budgets.js";
import { EXECUTION_STATE_PATH, publishExecutionCommand, requestExecution } from "../../core/execution-scheduler.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json",FIXTURE="src/validation/fixtures/execution-scheduler-fixture.js";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.budgets.ram"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-budget-"+startedAt,issuer=tag+":controller",receiver=tag+":executor",leaseId=tag+":authority",orderId=tag+":order",allocationId=tag+":ram",claim=authorityClaim("validation-resource",tag,"validation-execute");
 const ram=ns.getScriptRam(FIXTURE,"home"),limit=ram*1.5;
 try{
  auth(ns,acquireAuthority({requestId:tag+":grant",leaseId,owner:issuer,intent:"ram-budget-validation",claims:[claim],ttlMs:30000,correlationId:tag}));
  if((await authDecision(ns,tag+":grant",3000))?.outcome!=="GRANTED")throw new Error("Authority grant failed.");
  wo(ns,createWorkOrder({requestId:tag+":order",workOrderId:orderId,issuer,receiver,objective:"budget-fixture",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,constraints:{validation:true},ttlMs:25000,cleanupTtlMs:1000}));
  if((await woDecision(ns,tag+":order",3000))?.outcome!=="GRANTED")throw new Error("Work Order failed.");
  ex(ns,requestExecution({requestId:tag+":missing",executionId:tag+":missing",workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[500],ttlMs:10000}));
  check(a,"missing-budget-denied",(await exDecision(ns,tag+":missing",3000))?.reason==="ram-budget-missing","Managed execution without a RAM allocation failed closed.");
  budget(ns,setRamBudget({requestId:tag+":budget",allocationId,owner:receiver,limitGb:limit,correlationId:tag}));
  const allocated=await budgetDecision(ns,tag+":budget",3000);
  check(a,"budget-allocated",allocated?.outcome==="GRANTED"&&Math.abs((findBudget(ns,receiver)?.limitGb??0)-limit)<1e-9,"Budget Manager durably allocated "+limit+" GB to the validation owner.");
  ex(ns,requestExecution({requestId:tag+":over",executionId:tag+":over",workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:2,args:[500],ttlMs:10000}));
  const over=await exDecision(ns,tag+":over",3000);check(a,"over-budget-denied",over?.reason==="ram-budget-exceeded"&&!findExecution(ns,tag+":over"),"Two-thread request exceeded the logical RAM ceiling and never became an execution lease.");
  const firstId=tag+":first";ex(ns,requestExecution({requestId:tag+":first-request",executionId:firstId,workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[1200],ttlMs:10000}));
  check(a,"in-budget-accepted",(await exDecision(ns,tag+":first-request",3000))?.outcome==="QUEUED","One-thread request fit inside the owner's RAM budget.");
  const running=await wait(ns,()=>{const e=findExecution(ns,firstId);return e?.state==="RUNNING"?e:null;},3000);
  check(a,"usage-attributed",Boolean(running)&&running.budgetOwner===receiver&&Math.abs(running.ramRequired-ram)<1e-9,"Scheduler attributed the active "+ram+" GB reservation to the budget owner.");
  const firstDone=await wait(ns,()=>findExecution(ns,firstId)?.state==="COMPLETE",4000);
  check(a,"capacity-returned",Boolean(firstDone)&&activeUsage(ns,receiver)===0,"Terminal execution retired its reservation; active budget usage returned to 0 GB.");
  const secondId=tag+":second";ex(ns,requestExecution({requestId:tag+":second-request",executionId:secondId,workOrderId:orderId,receiver,correlationId:tag,budgetOwner:receiver,script:FIXTURE,threads:1,args:[500],ttlMs:10000}));
  if((await exDecision(ns,tag+":second-request",3000))?.outcome!=="QUEUED")throw new Error("Returned budget capacity was not reusable.");
  const secondDone=await wait(ns,()=>findExecution(ns,secondId)?.state==="COMPLETE",3000);
  check(a,"capacity-reused",Boolean(secondDone),"Returned RAM budget capacity admitted and completed a later managed execution.");
  budget(ns,releaseRamBudget({requestId:tag+":release-budget",allocationId,owner:receiver}));const released=await budgetDecision(ns,tag+":release-budget",3000);
  check(a,"budget-released",released?.outcome==="GRANTED"&&!findBudget(ns,receiver),"Owner released the durable RAM allocation cleanly.");
 }catch(error){check(a,"fixture-error",false,String(error?.message??error));}
 finally{
  budget(ns,releaseRamBudget({requestId:tag+":finally-budget",allocationId,owner:receiver}));await ns.sleep(200);
  wo(ns,closeWorkOrder({requestId:tag+":close",workOrderId:orderId,actor:issuer}));await ns.sleep(250);if(findOrder(ns,orderId)?.state==="CLOSING"){wo(ns,completeWorkOrder({requestId:tag+":complete",workOrderId:orderId,actor:receiver}));await ns.sleep(250);}
  auth(ns,releaseAuthority({requestId:tag+":release",leaseId,owner:issuer}));await ns.sleep(250);
 }
 const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary},null,2),"w");
 const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function budget(ns,c){if(!publishBudgetCommand(ns,c))throw new Error("Budget queue full.");} function auth(ns,c){if(!publishAuthorityCommand(ns,c))throw new Error("Authority queue full.");} function wo(ns,c){if(!publishWorkOrderCommand(ns,c))throw new Error("Work Order queue full.");} function ex(ns,c){if(!publishExecutionCommand(ns,c))throw new Error("Execution queue full.");}
async function budgetDecision(ns,id,t){return wait(ns,()=>read(ns,BUDGET_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function authDecision(ns,id,t){return wait(ns,()=>read(ns,AUTHORITY_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function woDecision(ns,id,t){return wait(ns,()=>read(ns,WORK_ORDER_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);} async function exDecision(ns,id,t){return wait(ns,()=>read(ns,EXECUTION_STATE_PATH)?.decisions?.find(x=>x.requestId===id),t);}
function findBudget(ns,owner){return read(ns,BUDGET_STATE_PATH)?.ramAllocations?.find(x=>x.owner===owner);} function findOrder(ns,id){return read(ns,WORK_ORDER_STATE_PATH)?.orders?.find(x=>x.workOrderId===id);} function findExecution(ns,id){return read(ns,EXECUTION_STATE_PATH)?.executions?.find(x=>x.executionId===id);}
function activeUsage(ns,owner){return (read(ns,EXECUTION_STATE_PATH)?.executions??[]).filter(e=>["RESERVED","RUNNING","DRAINING"].includes(e.state)&&e.budgetOwner===owner).reduce((n,e)=>n+(Number(e.ramRequired)||0),0);}
async function wait(ns,get,t){const end=Date.now()+t;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;} function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
