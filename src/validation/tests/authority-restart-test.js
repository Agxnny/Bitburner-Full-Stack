import { AUTHORITY_STATE_PATH, acquireAuthority, authorityClaim, directAuthorization, publishAuthorityCommand, releaseAuthority } from "../../core/authority.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json";
const SERVICE="src/core/authority-service.js";

export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.authority.restart"),startedAt=Date.now(),assertions=[];
    const validationVersion=requiredValidationVersion(readValidationPlan(ns),testId)??1;
    const tag="val-auth-restart-"+startedAt,owner=tag+":owner",other=tag+":other";
    const claim=authorityClaim("server","validation-restart-target","hacking-control");
    const leaseId=tag+":lease",conflictLease=tag+":conflict";
    let original=null,restartedPid=0,status="FAIL",summary="Authority restart recovery did not complete.";
    try{
        original=ns.ps("home").find(p=>p.filename===SERVICE);
        check(assertions,"service-running",Boolean(original),original?`Captured authority-service pid ${original.pid}.`:"Authority service is not running.");
        if(!original)throw new Error("Precondition failed: authority-service is not running.");

        send(ns,acquireAuthority({requestId:tag+":acquire",leaseId,owner,intent:"validation-restart",claims:[claim],ttlMs:7000,correlationId:tag}));
        const granted=await waitDecision(ns,tag+":acquire",2000);
        const before=read(ns,AUTHORITY_STATE_PATH)?.leases?.find(x=>x.leaseId===leaseId);
        check(assertions,"lease-durable-before-restart",granted?.outcome==="GRANTED"&&Boolean(before),before?`Lease durable with expiry ${before.expiresAt}.`:"Lease did not become durable.");
        if(!before)throw new Error("Precondition failed: authority lease did not become durable.");

        const originalExpiry=before.expiresAt,originalIssued=before.issuedAt,originalCorrelation=before.correlationId;
        if(!ns.kill(original.pid))throw new Error(`Could not stop authority-service pid ${original.pid}.`);
        await ns.sleep(250);
        restartedPid=ns.exec(SERVICE,"home",{threads:original.threads,preventDuplicates:true},...original.args);
        check(assertions,"service-restarted",restartedPid>0,restartedPid?`Authority service restarted at pid ${restartedPid}.`:"Authority service restart failed.");
        if(!restartedPid)throw new Error("Authority service restart failed.");

        const recovered=await waitLease(ns,leaseId,2000);
        check(assertions,"lease-recovered",Boolean(recovered)&&recovered.owner===owner&&recovered.correlationId===originalCorrelation&&recovered.claims?.length===1,"Restarted authority owner recovered the same unexpired owner, correlation, and claim.");
        check(assertions,"expiry-not-extended",recovered?.expiresAt===originalExpiry&&recovered?.issuedAt===originalIssued,"Restart recovery preserved the original issue time and absolute expiry; restart did not renew authority.");

        const auth=directAuthorization(read(ns,AUTHORITY_STATE_PATH),{leaseId,owner,claim});
        check(assertions,"authorization-after-restart",auth.authorized&&auth.mode==="DIRECT"&&auth.expiresAt===originalExpiry,"Recovered lease still authorizes its owner directly with the original expiry.");

        send(ns,acquireAuthority({requestId:tag+":conflict",leaseId:conflictLease,owner:other,intent:"validation-conflict-after-restart",claims:[claim],ttlMs:3000,correlationId:tag}));
        const conflict=await waitDecision(ns,tag+":conflict",2000);
        check(assertions,"conflict-after-restart",conflict?.outcome==="DENIED"&&conflict?.reason==="claim-conflict","Recovered lease still blocks an identical resource+capability claim after restart.");

        const expired=await waitAbsentLease(ns,leaseId,Math.max(1000,originalExpiry-Date.now()+2500));
        check(assertions,"expires-on-original-boundary",expired,"Recovered lease expired normally from its original absolute expiry rather than a restart-shifted expiry.");
        const denied=directAuthorization(read(ns,AUTHORITY_STATE_PATH),{leaseId,owner,claim});
        check(assertions,"post-expiry-fail-closed",!denied.authorized,"Authorization fails closed after the recovered lease expires.");
    }catch(error){summary=String(error?.message??error);}
    finally{
        send(ns,releaseAuthority({requestId:tag+":cleanup-main",leaseId,owner}));
        send(ns,releaseAuthority({requestId:tag+":cleanup-conflict",leaseId:conflictLease,owner:other}));
        await ns.sleep(300);
        if(!ns.ps("home").some(p=>p.filename===SERVICE))restartedPid=ns.exec(SERVICE,"home",{threads:original?.threads??1,preventDuplicates:true},...(original?.args??[]));
        status=assertions.every(x=>x.pass)?"PASS":"FAIL";
        if(status==="PASS")summary="Authority service restarted, recovered the exact live lease without extending it, preserved conflict/authorization behavior, and expired fail-closed on the original boundary.";
        const finishedAt=Date.now(),result={schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions,summary};
        ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
        const ev=evidenceRecord({testId,validationVersion,status,kind:"automated",summary,assertions,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
    }
}
function send(ns,cmd){if(!publishAuthorityCommand(ns,cmd))throw new Error("Authority command port full for "+cmd.requestId);}
async function waitDecision(ns,id,timeout){const end=Date.now()+timeout;while(Date.now()<end){const d=(read(ns,AUTHORITY_STATE_PATH)?.decisions??[]).find(x=>x.requestId===id);if(d)return d;await ns.sleep(50);}return null;}
async function waitLease(ns,id,timeout){const end=Date.now()+timeout;while(Date.now()<end){const x=(read(ns,AUTHORITY_STATE_PATH)?.leases??[]).find(v=>v.leaseId===id);if(x)return x;await ns.sleep(50);}return null;}
async function waitAbsentLease(ns,id,timeout){const end=Date.now()+timeout;while(Date.now()<end){if(!(read(ns,AUTHORITY_STATE_PATH)?.leases??[]).some(v=>v.leaseId===id))return true;await ns.sleep(50);}return false;}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
