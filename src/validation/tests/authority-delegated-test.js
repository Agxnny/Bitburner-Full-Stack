import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { WORK_ORDER_STATE_PATH, closeWorkOrder, createWorkOrder, delegatedAuthorization, publishWorkOrderCommand } from "../../core/work-orders.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";
export async function main(ns){
 ns.disableLog("ALL");const testId=String(ns.args[0]??"m3.authority.delegated"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
 const tag="val-delegated-"+startedAt,issuer=tag+":issuer",receiver=tag+":executor",other=tag+":other",leaseId=tag+":lease",orderId=tag+":order";
 const claim=authorityClaim("server","validation-target","hacking-control"),outside=authorityClaim("stock","VALID","trading-control");
 try{
  auth(ns,acquireAuthority({requestId:tag+":lease",leaseId,owner:issuer,intent:"validation-delegation",claims:[claim],ttlMs:7000,correlationId:tag}));
  check(a,"parent-authority",(await authDecision(ns,tag+":lease"))?.outcome==="GRANTED","Issuer obtained synthetic parent authority.");
  wo(ns,createWorkOrder({requestId:tag+":create",workOrderId:orderId,issuer,receiver,objective:"validation outcome",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,ttlMs:6000}));
  const created=await woDecision(ns,tag+":create");check(a,"order-activated",created?.outcome==="GRANTED"&&findOrder(ns,orderId)?.state==="ACTIVE","Authorized issuer created ACTIVE bounded Work Order.");
  const ok=delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orderId,receiver,claim});
  check(a,"delegated-authorized",ok.authorized&&ok.mode==="DELEGATED","Receiver without a direct lease is authorized by the valid delegation chain.");
  check(a,"receiver-bound",!delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orderId,receiver:other,claim}).authorized,"Another receiver cannot reuse the order.");
  check(a,"scope-bound",!delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orderId,receiver,claim:outside}).authorized,"Delegation cannot exceed order scope.");
  wo(ns,createWorkOrder({requestId:tag+":outside",workOrderId:tag+":outside",issuer,receiver,objective:"invalid scope",claims:[outside],authorityLeaseId:leaseId,correlationId:tag,ttlMs:3000}));
  check(a,"issuer-cannot-overdelegate",(await woDecision(ns,tag+":outside"))?.reason==="parent-claim-not-authorized","Issuer cannot delegate beyond parent authority.");
  const active=findOrder(ns,orderId),parent=read(ns,AUTHORITY_STATE_PATH)?.leases?.find(x=>x.leaseId===leaseId);
  check(a,"expiry-capped",active?.expiresAt<=parent?.expiresAt,"Work Order expiry is capped by parent authority.");
  wo(ns,closeWorkOrder({requestId:tag+":close",workOrderId:orderId,actor:receiver}));await woDecision(ns,tag+":close");
  check(a,"closed-denied",!delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orderId,receiver,claim}).authorized,"Closed order cannot authorize new work.");
  const order2=tag+":order2";wo(ns,createWorkOrder({requestId:tag+":create2",workOrderId:order2,issuer,receiver,objective:"parent loss proof",claims:[claim],authorityLeaseId:leaseId,correlationId:tag,ttlMs:4000}));await woDecision(ns,tag+":create2");
  auth(ns,releaseAuthority({requestId:tag+":release",leaseId,owner:issuer}));await authDecision(ns,tag+":release");
  const lost=delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:order2,receiver,claim});
  check(a,"parent-loss-immediate",!lost.authorized&&lost.reason==="parent-authority-not-found","Parent authority release immediately invalidates delegation.");
 }finally{auth(ns,releaseAuthority({requestId:tag+":cleanup",leaseId,owner:issuer}));await ns.sleep(300);}
 const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary},null,2),"w");
 const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function auth(ns,c){if(!publishAuthorityCommand(ns,c))throw new Error("Authority command queue full.");}
function wo(ns,c){if(!publishWorkOrderCommand(ns,c))throw new Error("Work Order command queue full.");}
async function authDecision(ns,id){return wait(ns,()=>read(ns,AUTHORITY_STATE_PATH)?.decisions?.find(x=>x.requestId===id));}
async function woDecision(ns,id){return wait(ns,()=>read(ns,WORK_ORDER_STATE_PATH)?.decisions?.find(x=>x.requestId===id));}
async function wait(ns,get){const end=Date.now()+3000;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;}
function findOrder(ns,id){return read(ns,WORK_ORDER_STATE_PATH)?.orders?.find(x=>x.workOrderId===id);}
function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
