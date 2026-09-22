import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { WORK_ORDER_STATE_PATH, cancelWorkOrder, cleanupAuthorization, closeWorkOrder, completeWorkOrder, createWorkOrder, delegatedAuthorization, publishWorkOrderCommand } from "../../core/work-orders.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";

export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.authority.cleanup"),startedAt=Date.now(),a=[],version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
    const tag="val-cleanup-"+startedAt,issuer=tag+":issuer",receiver=tag+":executor",other=tag+":other";
    const claim=authorityClaim("server","validation-cleanup-target","hacking-control"),outside=authorityClaim("stock","VALID","trading-control");
    const leases=[tag+":lease-a",tag+":lease-b",tag+":lease-c"],orders=[tag+":order-a",tag+":order-b",tag+":order-c"];
    try{
        await grant(ns,tag+":grant-a",leases[0],issuer,claim,tag,9000);
        await create(ns,tag+":create-a",orders[0],issuer,receiver,claim,leases[0],tag,7000,1500);
        wo(ns,closeWorkOrder({requestId:tag+":close-a",workOrderId:orders[0],actor:issuer}));await woDecision(ns,tag+":close-a");
        const closing=findOrder(ns,orders[0]);
        check(a,"drain-first-closing",closing?.state==="CLOSING"&&closing.closeReason==="requested"&&closing.cleanupExpiresAt>Date.now(),"Normal close enters CLOSING with a fixed bounded cleanup deadline.");
        check(a,"objective-stops",!delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[0],receiver,claim}).authorized,"CLOSING immediately denies new DELEGATED objective work.");
        const clean=cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[0],receiver,claim});
        check(a,"cleanup-authorized",clean.authorized&&clean.mode==="CLEANUP","Named receiver receives distinct CLEANUP authorization for original scope.");
        check(a,"cleanup-bounded",!cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[0],receiver:other,claim}).authorized&&!cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[0],receiver,claim:outside}).authorized,"Cleanup is receiver-bound and cannot exceed original claim scope.");
        wo(ns,completeWorkOrder({requestId:tag+":complete-a",workOrderId:orders[0],actor:receiver}));await woDecision(ns,tag+":complete-a");
        check(a,"receiver-completes",findOrder(ns,orders[0])?.state==="CLOSED"&&!cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[0],receiver,claim}).authorized,"Receiver completion closes early and removes cleanup authorization.");

        await grant(ns,tag+":grant-b",leases[1],issuer,claim,tag,9000);
        await create(ns,tag+":create-b",orders[1],issuer,receiver,claim,leases[1],tag,7000,1500);
        auth(ns,releaseAuthority({requestId:tag+":release-b",leaseId:leases[1],owner:issuer}));await authDecision(ns,tag+":release-b");
        const auto=await wait(ns,()=>findOrder(ns,orders[1])?.state==="CLOSING"?findOrder(ns,orders[1]):null);
        check(a,"parent-loss-closing",auto?.closeReason==="parent-authority-lost","Parent authority loss automatically moves ACTIVE work into CLOSING.");
        const surviving=cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[1],receiver,claim});
        check(a,"cleanup-survives-parent-loss",surviving.authorized&&surviving.mode==="CLEANUP","Bounded cleanup survives parent lease loss without restoring ordinary authority.");
        check(a,"parent-loss-objective-denied",!delegatedAuthorization(read(ns,AUTHORITY_STATE_PATH),read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[1],receiver,claim}).authorized,"Parent loss still denies all ordinary delegated objective work.");

        await grant(ns,tag+":grant-c",leases[2],issuer,claim,tag,9000);
        await create(ns,tag+":create-c",orders[2],issuer,receiver,claim,leases[2],tag,7000,1000);
        wo(ns,cancelWorkOrder({requestId:tag+":cancel-c",workOrderId:orders[2],actor:issuer}));await woDecision(ns,tag+":cancel-c");
        check(a,"forced-cancel-no-cleanup",findOrder(ns,orders[2])?.state==="CANCELLED"&&!cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:orders[2],receiver,claim}).authorized,"Forced cancellation is immediate and grants no cleanup authorization.");

        const timeoutOrder=tag+":timeout";await create(ns,tag+":create-timeout",timeoutOrder,issuer,receiver,claim,leases[2],tag,5000,500);
        wo(ns,closeWorkOrder({requestId:tag+":close-timeout",workOrderId:timeoutOrder,actor:issuer}));await woDecision(ns,tag+":close-timeout");
        const failed=await wait(ns,()=>findOrder(ns,timeoutOrder)?.state==="FAILED"?findOrder(ns,timeoutOrder):null,2000);
        check(a,"cleanup-timeout-fail-closed",failed?.state==="FAILED"&&!cleanupAuthorization(read(ns,WORK_ORDER_STATE_PATH),{workOrderId:timeoutOrder,receiver,claim}).authorized,"Uncompleted cleanup expires to FAILED and fails closed rather than extending itself.");
    }finally{
        for(let i=0;i<leases.length;i++)auth(ns,releaseAuthority({requestId:tag+":cleanup-"+i,leaseId:leases[i],owner:issuer}));
        await ns.sleep(300);
    }
    const status=a.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=a.filter(x=>x.pass).length+"/"+a.length+" assertions passed.";
    ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions:a,summary},null,2),"w");
    const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions:a,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
async function grant(ns,id,leaseId,owner,claim,correlationId,ttlMs){auth(ns,acquireAuthority({requestId:id,leaseId,owner,intent:"validation-cleanup",claims:[claim],ttlMs,correlationId}));const d=await authDecision(ns,id);if(d?.outcome!=="GRANTED")throw new Error("Synthetic authority grant failed.");}
async function create(ns,id,workOrderId,issuer,receiver,claim,leaseId,correlationId,ttlMs,cleanupTtlMs){wo(ns,createWorkOrder({requestId:id,workOrderId,issuer,receiver,objective:"validation cleanup",claims:[claim],authorityLeaseId:leaseId,correlationId,ttlMs,cleanupTtlMs}));const d=await woDecision(ns,id);if(d?.outcome!=="GRANTED")throw new Error("Synthetic Work Order creation failed.");}
function auth(ns,c){if(!publishAuthorityCommand(ns,c))throw new Error("Authority queue full.");}
function wo(ns,c){if(!publishWorkOrderCommand(ns,c))throw new Error("Work Order queue full.");}
async function authDecision(ns,id){return wait(ns,()=>read(ns,AUTHORITY_STATE_PATH)?.decisions?.find(x=>x.requestId===id));}
async function woDecision(ns,id){return wait(ns,()=>read(ns,WORK_ORDER_STATE_PATH)?.decisions?.find(x=>x.requestId===id));}
async function wait(ns,get,timeout=3000){const end=Date.now()+timeout;while(Date.now()<end){const v=get();if(v)return v;await ns.sleep(50);}return null;}
function findOrder(ns,id){return read(ns,WORK_ORDER_STATE_PATH)?.orders?.find(x=>x.workOrderId===id);}
function check(a,id,pass,evidence){a.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
