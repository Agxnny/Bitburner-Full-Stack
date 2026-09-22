import { PORTS } from "./ports.js";
import { AUTHORITY_STATE_PATH, claimKey, validAuthorityCommand } from "./authority.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="authority-service";
const LOOP_MS=200;
const DECISION_LIMIT=80;

export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | authority-service must run on home");return;}
    ns.disableLog("sleep");
    const startedAt=Date.now();
    const state=load(ns);
    reconcile(state,Date.now());
    persist(ns,state);
    while(true){
        const now=Date.now();
        const changed=drain(ns,state,now)|reconcile(state,now);
        if(changed)persist(ns,state);
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"authorizing",staleAfterMs:3000,details:{activeLeases:state.leases.length,decisions:state.decisions.length}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,state,now){
    const h=ns.getPortHandle(PORTS.AUTHORITY);let changed=0;
    while(!h.empty()){
        let cmd;try{cmd=JSON.parse(h.read());}catch{continue;}
        if(!validAuthorityCommand(cmd)){decision(state,{requestId:cmd?.requestId??"invalid",action:cmd?.action??"invalid",outcome:"DENIED",reason:"invalid-command",at:now});changed=1;continue;}
        if(state.decisions.some(x=>x.requestId===cmd.requestId))continue;
        if(cmd.action==="acquire")handleAcquire(state,cmd,now);
        if(cmd.action==="renew")handleRenew(state,cmd,now);
        if(cmd.action==="release")handleRelease(state,cmd,now);
        changed=1;
    }
    return changed;
}
function handleAcquire(state,cmd,now){
    if(state.leases.some(x=>x.leaseId===cmd.leaseId)){decision(state,{requestId:cmd.requestId,action:"acquire",outcome:"DENIED",reason:"lease-id-in-use",leaseId:cmd.leaseId,at:now});return;}
    const wanted=new Set(cmd.claims.map(claimKey));
    const conflicts=state.leases.filter(x=>x.expiresAt>now&&x.claims.some(c=>wanted.has(claimKey(c)))).map(x=>({leaseId:x.leaseId,owner:x.owner,claims:x.claims.filter(c=>wanted.has(claimKey(c)))}));
    if(conflicts.length){decision(state,{requestId:cmd.requestId,action:"acquire",outcome:"DENIED",reason:"claim-conflict",leaseId:cmd.leaseId,conflicts,at:now});return;}
    const lease={leaseId:cmd.leaseId,owner:cmd.owner,intent:cmd.intent,claims:cmd.claims,correlationId:cmd.correlationId??null,issuedAt:now,renewedAt:now,expiresAt:now+cmd.ttlMs};
    state.leases.push(lease);
    decision(state,{requestId:cmd.requestId,action:"acquire",outcome:"GRANTED",reason:"granted",leaseId:cmd.leaseId,expiresAt:lease.expiresAt,at:now});
}
function handleRenew(state,cmd,now){
    const lease=state.leases.find(x=>x.leaseId===cmd.leaseId);
    if(!lease){decision(state,{requestId:cmd.requestId,action:"renew",outcome:"DENIED",reason:"lease-not-found",leaseId:cmd.leaseId,at:now});return;}
    if(lease.owner!==cmd.owner){decision(state,{requestId:cmd.requestId,action:"renew",outcome:"DENIED",reason:"owner-mismatch",leaseId:cmd.leaseId,at:now});return;}
    lease.renewedAt=now;lease.expiresAt=now+cmd.ttlMs;
    decision(state,{requestId:cmd.requestId,action:"renew",outcome:"GRANTED",reason:"renewed",leaseId:cmd.leaseId,expiresAt:lease.expiresAt,at:now});
}
function handleRelease(state,cmd,now){
    const i=state.leases.findIndex(x=>x.leaseId===cmd.leaseId);
    if(i<0){decision(state,{requestId:cmd.requestId,action:"release",outcome:"GRANTED",reason:"already-absent",leaseId:cmd.leaseId,at:now});return;}
    if(state.leases[i].owner!==cmd.owner){decision(state,{requestId:cmd.requestId,action:"release",outcome:"DENIED",reason:"owner-mismatch",leaseId:cmd.leaseId,at:now});return;}
    state.leases.splice(i,1);
    decision(state,{requestId:cmd.requestId,action:"release",outcome:"GRANTED",reason:"released",leaseId:cmd.leaseId,at:now});
}
function reconcile(state,now){
    const expired=state.leases.filter(x=>!Number.isFinite(x.expiresAt)||x.expiresAt<=now);
    if(!expired.length)return 0;
    state.leases=state.leases.filter(x=>Number.isFinite(x.expiresAt)&&x.expiresAt>now);
    for(const x of expired)decision(state,{requestId:"expiry:"+x.leaseId+":"+x.expiresAt,action:"expire",outcome:"EXPIRED",reason:"ttl-expired",leaseId:x.leaseId,owner:x.owner,at:now});
    return 1;
}
function decision(state,d){state.decisions.unshift(d);if(state.decisions.length>DECISION_LIMIT)state.decisions.length=DECISION_LIMIT;}
function persist(ns,state){state.generatedAt=Date.now();ns.write(AUTHORITY_STATE_PATH,JSON.stringify(state,null,2),"w");}
function load(ns){
    if(ns.fileExists(AUTHORITY_STATE_PATH,"home"))try{const v=JSON.parse(ns.read(AUTHORITY_STATE_PATH));if(v?.schemaVersion===1&&v?.kind==="authority-state"&&v?.owner===SERVICE&&Array.isArray(v.leases)&&Array.isArray(v.decisions))return v;}catch{}
    return {schemaVersion:1,kind:"authority-state",owner:SERVICE,generatedAt:Date.now(),leases:[],decisions:[]};
}
