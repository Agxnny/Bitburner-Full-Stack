import { BUDGET_STATE_PATH, moneyAvailableFor, publishBudgetCommand, releaseMoneyBudget, releaseMoneyReservation, reserveMoney, setMoneyBudget, settleMoneyReservation } from "../../core/resource-budgets.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.budgets.money"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-money-"+startedAt,owner=tag+":owner",allocationId=tag+":allocation",r1=tag+":reservation-1",r2=tag+":reservation-2";
 const beforeMoney=ns.getServerMoneyAvailable("home");
 try{
  budget(ns,reserveMoney({requestId:tag+":missing",reservationId:tag+":missing-r",allocationId,owner,amount:100,correlationId:tag}));
  check(a,"missing-budget-denied",(await decision(ns,tag+":missing",3000))?.reason==="money-budget-missing","Money reservation without an allocation failed closed.");
  budget(ns,setMoneyBudget({requestId:tag+":allocate",allocationId,owner,limit:1000,correlationId:tag}));
  const allocated=await decision(ns,tag+":allocate",3000),b=findBudget(ns,owner);
  check(a,"budget-allocated",allocated?.outcome==="GRANTED"&&b?.limit===1000&&b?.spent===0,"Budget Manager durably allocated a synthetic $1,000 ceiling with $0 spent.");
  budget(ns,reserveMoney({requestId:tag+":reserve-1",reservationId:r1,allocationId,owner,amount:600,correlationId:tag}));
  const reserved=await decision(ns,tag+":reserve-1",3000);
  check(a,"reservation-created",reserved?.outcome==="GRANTED"&&findReservation(ns,r1)?.state==="RESERVED"&&moneyAvailableFor(read(ns),owner)===400,"$600 reservation immediately reduced available budget to $400.");
  budget(ns,reserveMoney({requestId:tag+":over",reservationId:tag+":over-r",allocationId,owner,amount:500,correlationId:tag}));
  check(a,"over-budget-denied",(await decision(ns,tag+":over",3000))?.reason==="money-budget-exceeded"&&!findReservation(ns,tag+":over-r"),"$500 request exceeded the remaining $400 and created no reservation.");
  budget(ns,releaseMoneyReservation({requestId:tag+":release-r1",reservationId:r1,owner}));
  check(a,"reservation-released",(await decision(ns,tag+":release-r1",3000))?.outcome==="GRANTED"&&moneyAvailableFor(read(ns),owner)===1000,"Releasing the unspent reservation restored the full $1,000 capacity.");
  budget(ns,reserveMoney({requestId:tag+":reserve-2",reservationId:r2,allocationId,owner,amount:700,correlationId:tag}));
  if((await decision(ns,tag+":reserve-2",3000))?.outcome!=="GRANTED")throw new Error("Settlement reservation was not granted.");
  budget(ns,settleMoneyReservation({requestId:tag+":settle",reservationId:r2,owner,actualAmount:650}));
  const settled=await decision(ns,tag+":settle",3000),afterSettle=findBudget(ns,owner);
  check(a,"reservation-settled",settled?.outcome==="GRANTED"&&findReservation(ns,r2)?.state==="SETTLED"&&afterSettle?.spent===650&&moneyAvailableFor(read(ns),owner)===350,"Settling $650 converted reserved capacity into durable spent accounting and left $350 available.");
  check(a,"game-money-unchanged",ns.getServerMoneyAvailable("home")===beforeMoney,"Synthetic budget accounting did not spend or mutate player money.");
  budget(ns,releaseMoneyBudget({requestId:tag+":release-budget",allocationId,owner}));
  const released=await decision(ns,tag+":release-budget",3000);
  check(a,"budget-released",released?.outcome==="GRANTED"&&!findBudget(ns,owner)&&!findReservation(ns,r2),"Owner retired the money allocation and its terminal reservation history cleanly.");
 }catch(error){check(a,"fixture-error",false,String(error?.message??error));}
 finally{
  const live=findReservation(ns,r1);if(live?.state==="RESERVED"){budget(ns,releaseMoneyReservation({requestId:tag+":finally-r1",reservationId:r1,owner}));await ns.sleep(200);}
  const live2=findReservation(ns,r2);if(live2?.state==="RESERVED"){budget(ns,releaseMoneyReservation({requestId:tag+":finally-r2",reservationId:r2,owner}));await ns.sleep(200);}
  budget(ns,releaseMoneyBudget({requestId:tag+":finally-budget",allocationId,owner}));await ns.sleep(250);
 }
 const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary},null,2),"w");
 const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function budget(ns,c){if(!publishBudgetCommand(ns,c))throw new Error("Budget queue full.");}
async function decision(ns,id,t){return wait(ns,()=>read(ns)?.decisions?.find(x=>x.requestId===id),t);}
function findBudget(ns,owner){return read(ns)?.moneyAllocations?.find(x=>x.owner===owner);} function findReservation(ns,id){return read(ns)?.moneyReservations?.find(x=>x.reservationId===id);}
async function wait(ns,get,t){const end=Date.now()+t;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;} function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});}
function read(ns){if(!ns.fileExists(BUDGET_STATE_PATH,"home"))return null;try{return JSON.parse(ns.read(BUDGET_STATE_PATH));}catch{return null;}}
