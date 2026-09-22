import { AUTHORITY_STATE_PATH, directAuthorization } from "./authority.js";
import { PORTS } from "./ports.js";
import { WORK_ORDER_STATE_PATH, validWorkOrderCommand } from "./work-orders.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="work-order-service", LOOP_MS=200, DECISION_LIMIT=80;

export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | work-order-service must run on home");return;}
    ns.disableLog("sleep");
    const startedAt=Date.now(),state=load(ns);
    reconcile(ns,state,Date.now());persist(ns,state);
    while(true){
        const now=Date.now(),changed=drain(ns,state,now)|reconcile(ns,state,now);
        if(changed)persist(ns,state);
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"coordinating",staleAfterMs:3000,details:{activeOrders:state.orders.filter(x=>x.state==="ACTIVE").length,closingOrders:state.orders.filter(x=>x.state==="CLOSING").length,decisions:state.decisions.length}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,state,now){
    const h=ns.getPortHandle(PORTS.WORK_ORDERS);let changed=0;
    while(!h.empty()){
        let cmd;try{cmd=JSON.parse(h.read());}catch{continue;}
        if(!validWorkOrderCommand(cmd)){decision(state,{requestId:cmd?.requestId??"invalid",action:cmd?.action??"invalid",outcome:"DENIED",reason:"invalid-command",at:now});changed=1;continue;}
        if(state.decisions.some(x=>x.requestId===cmd.requestId))continue;
        if(cmd.action==="create")create(ns,state,cmd,now);
        if(cmd.action==="close")beginClose(state,cmd,now);
        if(cmd.action==="complete")complete(state,cmd,now);
        if(cmd.action==="cancel")cancel(state,cmd,now);
        changed=1;
    }
    return changed;
}
function create(ns,state,cmd,now){
    if(state.orders.some(x=>x.workOrderId===cmd.workOrderId)){decision(state,{requestId:cmd.requestId,action:"create",outcome:"DENIED",reason:"work-order-id-in-use",workOrderId:cmd.workOrderId,at:now});return;}
    const authority=read(ns,AUTHORITY_STATE_PATH),parent=authority?.leases?.find(x=>x.leaseId===cmd.authorityLeaseId);
    if(!parent||parent.owner!==cmd.issuer||parent.correlationId!==cmd.correlationId){decision(state,{requestId:cmd.requestId,action:"create",outcome:"DENIED",reason:"parent-authority-mismatch",workOrderId:cmd.workOrderId,at:now});return;}
    const authorized=cmd.claims.every(claim=>directAuthorization(authority,{leaseId:cmd.authorityLeaseId,owner:cmd.issuer,claim,at:now}).authorized);
    if(!authorized){decision(state,{requestId:cmd.requestId,action:"create",outcome:"DENIED",reason:"parent-claim-not-authorized",workOrderId:cmd.workOrderId,at:now});return;}
    const expiresAt=Math.min(now+cmd.ttlMs,parent.expiresAt);
    if(expiresAt<=now){decision(state,{requestId:cmd.requestId,action:"create",outcome:"DENIED",reason:"parent-authority-expired",workOrderId:cmd.workOrderId,at:now});return;}
    state.orders.push({schemaVersion:1,kind:"work-order",workOrderId:cmd.workOrderId,issuer:cmd.issuer,receiver:cmd.receiver,objective:cmd.objective,claims:cmd.claims,authorityLeaseId:cmd.authorityLeaseId,correlationId:cmd.correlationId,constraints:cmd.constraints??null,state:"ACTIVE",createdAt:now,updatedAt:now,expiresAt,cleanupTtlMs:cmd.cleanupTtlMs,cleanupExpiresAt:null,closeReason:null});
    decision(state,{requestId:cmd.requestId,action:"create",outcome:"GRANTED",reason:"activated",workOrderId:cmd.workOrderId,expiresAt,at:now});
}
function beginClose(state,cmd,now){
    const order=state.orders.find(x=>x.workOrderId===cmd.workOrderId);
    if(!order){decision(state,{requestId:cmd.requestId,action:"close",outcome:"GRANTED",reason:"already-absent",workOrderId:cmd.workOrderId,at:now});return;}
    if(cmd.actor!==order.issuer&&cmd.actor!==order.receiver){decision(state,{requestId:cmd.requestId,action:"close",outcome:"DENIED",reason:"actor-mismatch",workOrderId:cmd.workOrderId,at:now});return;}
    if(order.state==="ACTIVE")startClosing(order,now,"requested");
    decision(state,{requestId:cmd.requestId,action:"close",outcome:"GRANTED",reason:order.state.toLowerCase(),workOrderId:cmd.workOrderId,cleanupExpiresAt:order.cleanupExpiresAt??null,at:now});
}
function complete(state,cmd,now){
    const order=state.orders.find(x=>x.workOrderId===cmd.workOrderId);
    if(!order){decision(state,{requestId:cmd.requestId,action:"complete",outcome:"GRANTED",reason:"already-absent",workOrderId:cmd.workOrderId,at:now});return;}
    if(cmd.actor!==order.receiver){decision(state,{requestId:cmd.requestId,action:"complete",outcome:"DENIED",reason:"receiver-required",workOrderId:cmd.workOrderId,at:now});return;}
    if(order.state!=="CLOSING"){decision(state,{requestId:cmd.requestId,action:"complete",outcome:"DENIED",reason:"not-closing",workOrderId:cmd.workOrderId,at:now});return;}
    order.state="CLOSED";order.updatedAt=now;order.cleanupExpiresAt=null;
    decision(state,{requestId:cmd.requestId,action:"complete",outcome:"GRANTED",reason:"closed",workOrderId:cmd.workOrderId,at:now});
}
function cancel(state,cmd,now){
    const order=state.orders.find(x=>x.workOrderId===cmd.workOrderId);
    if(!order){decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"GRANTED",reason:"already-absent",workOrderId:cmd.workOrderId,at:now});return;}
    if(cmd.actor!==order.issuer&&cmd.actor!==order.receiver){decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"DENIED",reason:"actor-mismatch",workOrderId:cmd.workOrderId,at:now});return;}
    if(order.state==="ACTIVE"||order.state==="CLOSING"){order.state="CANCELLED";order.updatedAt=now;order.cleanupExpiresAt=null;order.closeReason="forced-cancel";}
    decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"GRANTED",reason:order.state.toLowerCase(),workOrderId:cmd.workOrderId,at:now});
}
function reconcile(ns,state,now){
    const authority=read(ns,AUTHORITY_STATE_PATH);let changed=0;
    for(const order of state.orders){
        if(order.state==="ACTIVE"){
            const parent=authority?.leases?.find(x=>x.leaseId===order.authorityLeaseId);
            const parentValid=parent&&parent.owner===order.issuer&&parent.correlationId===order.correlationId&&Number.isFinite(parent.expiresAt)&&parent.expiresAt>now;
            if(!parentValid){startClosing(order,now,"parent-authority-lost");changed=1;continue;}
            if(!Number.isFinite(order.expiresAt)||order.expiresAt<=now){startClosing(order,now,"order-expired");changed=1;}
        }else if(order.state==="CLOSING"&&(!Number.isFinite(order.cleanupExpiresAt)||order.cleanupExpiresAt<=now)){
            order.state="FAILED";order.updatedAt=now;order.cleanupExpiresAt=null;order.closeReason=order.closeReason??"cleanup-timeout";changed=1;
        }
    }
    return changed;
}
function startClosing(order,now,reason){order.state="CLOSING";order.updatedAt=now;order.closeReason=reason;order.cleanupExpiresAt=now+order.cleanupTtlMs;}
function decision(state,d){state.decisions.unshift(d);if(state.decisions.length>DECISION_LIMIT)state.decisions.length=DECISION_LIMIT;}
function persist(ns,state){state.generatedAt=Date.now();ns.write(WORK_ORDER_STATE_PATH,JSON.stringify(state,null,2),"w");}
function load(ns){if(ns.fileExists(WORK_ORDER_STATE_PATH,"home"))try{const v=JSON.parse(ns.read(WORK_ORDER_STATE_PATH));if(v?.schemaVersion===1&&v?.kind==="work-order-state"&&v?.owner===SERVICE&&Array.isArray(v.orders)&&Array.isArray(v.decisions))return migrate(v);}catch{}return {schemaVersion:1,kind:"work-order-state",owner:SERVICE,generatedAt:Date.now(),orders:[],decisions:[]};}
function migrate(state){for(const o of state.orders){if(!Number.isFinite(o.cleanupTtlMs))o.cleanupTtlMs=3000;if(!("cleanupExpiresAt" in o))o.cleanupExpiresAt=null;if(!("closeReason" in o))o.closeReason=null;}return state;}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
