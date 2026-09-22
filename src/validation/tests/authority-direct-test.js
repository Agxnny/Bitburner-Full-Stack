import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, directAuthorization, publishAuthorityCommand, releaseAuthority, renewAuthority, validAuthorityState } from "../../core/authority.js";
import { delegatedAuthorizationContext, validWorkOrder, workOrder } from "../../core/work-orders.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json";
export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.authority.direct"),startedAt=Date.now(),assertions=[];
    const version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
    const tag="val-auth-"+startedAt, ownerA=tag+":A",ownerB=tag+":B";
    const hack=authorityClaim("server","validation-target","hacking-control");
    const trade=authorityClaim("server","validation-target","trading-control");
    const stock=authorityClaim("stock","VALID","trading-control");
    const leaseA=tag+":leaseA",leaseB=tag+":leaseB",leaseC=tag+":leaseC",leaseD=tag+":leaseD";
    try{
        send(ns,acquireAuthority({requestId:tag+":a1",leaseId:leaseA,owner:ownerA,intent:"validation-hwgw",claims:[hack,stock],ttlMs:5000,correlationId:tag}));
        const a1=await decision(ns,tag+":a1");check(assertions,"atomic-grant",a1?.outcome==="GRANTED","Atomic two-claim lease was granted as one authority unit.");

        send(ns,acquireAuthority({requestId:tag+":b1",leaseId:leaseB,owner:ownerB,intent:"validation-conflict",claims:[hack],ttlMs:5000,correlationId:tag}));
        const b1=await decision(ns,tag+":b1");check(assertions,"same-capability-conflict",b1?.outcome==="DENIED"&&b1?.reason==="claim-conflict","Second owner was denied the identical resource+capability claim.");

        send(ns,acquireAuthority({requestId:tag+":b2",leaseId:leaseB,owner:ownerB,intent:"validation-compatible",claims:[trade],ttlMs:5000,correlationId:tag}));
        const b2=await decision(ns,tag+":b2");check(assertions,"compatible-capability",b2?.outcome==="GRANTED","Different capability on the same resource coexists under the first-slice compatibility rule.");

        const state1=read(ns,AUTHORITY_STATE_PATH);
        check(assertions,"direct-authorized",directAuthorization(state1,{leaseId:leaseA,owner:ownerA,claim:hack}).mode==="DIRECT","Current owner receives DIRECT authorization for an included claim.");
        check(assertions,"wrong-owner-denied",!directAuthorization(state1,{leaseId:leaseA,owner:ownerB,claim:hack}).authorized,"Wrong owner fails closed against an otherwise valid lease.");
        check(assertions,"outside-claim-denied",!directAuthorization(state1,{leaseId:leaseA,owner:ownerA,claim:trade}).authorized,"Lease cannot authorize a capability outside its granted scope.");

        send(ns,renewAuthority({requestId:tag+":renew",leaseId:leaseA,owner:ownerA,ttlMs:6000}));
        const renew=await decision(ns,tag+":renew");check(assertions,"renew-owner-only",renew?.outcome==="GRANTED"&&Number.isFinite(renew?.expiresAt),"Lease owner renewed authority with a new bounded expiry.");

        send(ns,releaseAuthority({requestId:tag+":releaseA",leaseId:leaseA,owner:ownerA}));
        const rel=await decision(ns,tag+":releaseA");check(assertions,"release",rel?.outcome==="GRANTED"&&rel?.reason==="released","Owner explicitly released the atomic lease.");

        send(ns,acquireAuthority({requestId:tag+":atomic",leaseId:leaseC,owner:ownerA,intent:"validation-atomic-conflict",claims:[hack,trade],ttlMs:5000,correlationId:tag}));
        const atomic=await decision(ns,tag+":atomic");check(assertions,"atomic-denial",atomic?.outcome==="DENIED"&&!lease(ns,leaseC),"Multi-claim request with one conflict was denied completely; no partial lease exists.");

        send(ns,acquireAuthority({requestId:tag+":expiry",leaseId:leaseD,owner:ownerA,intent:"validation-expiry",claims:[stock],ttlMs:1000,correlationId:tag}));
        await decision(ns,tag+":expiry");await ns.sleep(1400);
        const expiredState=read(ns,AUTHORITY_STATE_PATH);
        check(assertions,"expiry-fail-closed",!lease(ns,leaseD)&&!directAuthorization(expiredState,{leaseId:leaseD,owner:ownerA,claim:stock}).authorized,"Expired lease was reconciled away and authorization fails closed.");

        const wo=workOrder({workOrderId:tag+":wo",issuer:"validation-coordinator",receiver:"validation-domain",objective:"validation-only-outcome",claims:[hack],authorityLeaseId:"parent-lease",correlationId:tag});
        const ctx=delegatedAuthorizationContext(wo);
        check(assertions,"work-order-contract",validWorkOrder(wo)&&ctx?.mode==="DELEGATED"&&ctx?.workOrderId===wo.workOrderId,"Work-order/delegation envelope is versioned and distinguishable from DIRECT authority.");
        check(assertions,"work-order-not-authority",!directAuthorization(expiredState,{leaseId:wo.authorityLeaseId,owner:wo.receiver,claim:hack}).authorized,"A valid work order alone does not lend or create authority.");
        check(assertions,"state-contract",validAuthorityState(read(ns,AUTHORITY_STATE_PATH)),"Durable authority state remains valid after grant/deny/renew/release/expiry operations.");
    }finally{
        for(const [id,owner] of [[leaseA,ownerA],[leaseB,ownerB],[leaseC,ownerA],[leaseD,ownerA]])send(ns,releaseAuthority({requestId:tag+":cleanup:"+id,leaseId:id,owner}));
        await ns.sleep(500);
    }
    const status=assertions.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=assertions.filter(x=>x.pass).length+"/"+assertions.length+" assertions passed.";
    ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions,summary},null,2),"w");
    const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
function send(ns,cmd){if(!publishAuthorityCommand(ns,cmd))throw new Error("Authority command port full for "+cmd.requestId);}
async function decision(ns,id,timeout=3000){const end=Date.now()+timeout;while(Date.now()<end){const d=(read(ns,AUTHORITY_STATE_PATH)?.decisions??[]).find(x=>x.requestId===id);if(d)return d;await ns.sleep(50);}return null;}
function lease(ns,id){return (read(ns,AUTHORITY_STATE_PATH)?.leases??[]).find(x=>x.leaseId===id);}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
