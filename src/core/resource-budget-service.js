import { PORTS } from "./ports.js";
import { BUDGET_DECISION_LIMIT, BUDGET_STATE_PATH, moneyAvailableFor, validBudgetCommand, validBudgetState } from "./resource-budgets.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="resource-budget-manager",LOOP_MS=200;
export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | resource-budget-manager must run on home");return;}
    ns.disableLog("sleep");const startedAt=Date.now(),state=load(ns);persist(ns,state);
    while(true){
        const changed=drain(ns,state,Date.now());if(changed)persist(ns,state);
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"allocating",staleAfterMs:3000,details:{ramAllocations:state.ramAllocations.length,allocatedRamGb:state.ramAllocations.reduce((n,x)=>n+x.limitGb,0),moneyAllocations:state.moneyAllocations.length,moneyReservations:state.moneyReservations.filter(x=>x.state==="RESERVED").length,allocatedMoney:state.moneyAllocations.reduce((n,x)=>n+x.limit,0),spentMoney:state.moneyAllocations.reduce((n,x)=>n+x.spent,0),decisions:state.decisions.length}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,state,now){
    const h=ns.getPortHandle(PORTS.RESOURCE_BUDGETS);let changed=0;
    while(!h.empty()){
        let cmd;try{cmd=JSON.parse(h.read());}catch{continue;}
        if(!validBudgetCommand(cmd)){decision(state,{requestId:cmd?.requestId??"invalid",action:cmd?.action??"invalid",outcome:"DENIED",reason:"invalid-command",at:now});changed=1;continue;}
        if(state.decisions.some(x=>x.requestId===cmd.requestId))continue;
        if(cmd.action==="set-ram")setRam(state,cmd,now);else if(cmd.action==="release-ram")releaseRam(state,cmd,now);
        else if(cmd.action==="set-money")setMoney(state,cmd,now);else if(cmd.action==="reserve-money")reserveMoney(state,cmd,now);
        else if(cmd.action==="release-money")releaseMoney(state,cmd,now);else if(cmd.action==="settle-money")settleMoney(state,cmd,now);else releaseMoneyBudget(state,cmd,now);
        changed=1;
    }return changed;
}
function setRam(state,cmd,now){
    const byId=state.ramAllocations.find(x=>x.allocationId===cmd.allocationId),byOwner=state.ramAllocations.find(x=>x.owner===cmd.owner);
    if(byId&&byId.owner!==cmd.owner)return deny(state,cmd,"allocation-id-in-use",now);
    if(byOwner&&byOwner.allocationId!==cmd.allocationId)return deny(state,cmd,"owner-already-allocated",now);
    const current=byId??byOwner;if(current){current.limitGb=cmd.limitGb;current.correlationId=cmd.correlationId;current.updatedAt=now;}
    else state.ramAllocations.push({schemaVersion:1,kind:"ram-budget",allocationId:cmd.allocationId,owner:cmd.owner,limitGb:cmd.limitGb,correlationId:cmd.correlationId,createdAt:now,updatedAt:now});
    decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:current?"updated":"allocated",allocationId:cmd.allocationId,owner:cmd.owner,limitGb:cmd.limitGb,at:now});
}
function releaseRam(state,cmd,now){
    const i=state.ramAllocations.findIndex(x=>x.allocationId===cmd.allocationId);if(i<0)return grant(state,cmd,"already-absent",now);
    if(state.ramAllocations[i].owner!==cmd.owner)return deny(state,cmd,"owner-mismatch",now);
    state.ramAllocations.splice(i,1);grant(state,cmd,"released",now);
}
function setMoney(state,cmd,now){
    const byId=state.moneyAllocations.find(x=>x.allocationId===cmd.allocationId),byOwner=state.moneyAllocations.find(x=>x.owner===cmd.owner);
    if(byId&&byId.owner!==cmd.owner)return deny(state,cmd,"allocation-id-in-use",now);
    if(byOwner&&byOwner.allocationId!==cmd.allocationId)return deny(state,cmd,"owner-already-allocated",now);
    const current=byId??byOwner;
    if(current&&cmd.limit<current.spent+reserved(state,current.allocationId))return deny(state,cmd,"limit-below-committed",now);
    if(current){current.limit=cmd.limit;current.correlationId=cmd.correlationId;current.updatedAt=now;}
    else state.moneyAllocations.push({schemaVersion:1,kind:"money-budget",allocationId:cmd.allocationId,owner:cmd.owner,limit:cmd.limit,spent:0,correlationId:cmd.correlationId,createdAt:now,updatedAt:now});
    decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:current?"updated":"allocated",allocationId:cmd.allocationId,owner:cmd.owner,limit:cmd.limit,at:now});
}
function reserveMoney(state,cmd,now){
    const b=state.moneyAllocations.find(x=>x.allocationId===cmd.allocationId);
    if(!b)return deny(state,cmd,"money-budget-missing",now);if(b.owner!==cmd.owner)return deny(state,cmd,"owner-mismatch",now);
    const existing=state.moneyReservations.find(x=>x.reservationId===cmd.reservationId);
    if(existing)return deny(state,cmd,"reservation-id-in-use",now);
    const available=moneyAvailableFor(state,cmd.owner);if(cmd.amount>available)return deny(state,cmd,"money-budget-exceeded",now,{amount:cmd.amount,available,limit:b.limit,spent:b.spent});
    state.moneyReservations.push({schemaVersion:1,kind:"money-reservation",reservationId:cmd.reservationId,allocationId:cmd.allocationId,owner:cmd.owner,amount:cmd.amount,correlationId:cmd.correlationId,state:"RESERVED",createdAt:now,updatedAt:now,settledAmount:null});
    decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:"reserved",reservationId:cmd.reservationId,allocationId:cmd.allocationId,owner:cmd.owner,amount:cmd.amount,availableAfter:available-cmd.amount,at:now});
}
function releaseMoney(state,cmd,now){
    const r=state.moneyReservations.find(x=>x.reservationId===cmd.reservationId);if(!r)return grant(state,cmd,"already-absent",now);
    if(r.owner!==cmd.owner)return deny(state,cmd,"owner-mismatch",now);if(r.state!=="RESERVED")return deny(state,cmd,"reservation-terminal",now);
    r.state="RELEASED";r.updatedAt=now;grant(state,cmd,"released",now,{reservationId:r.reservationId});
}
function settleMoney(state,cmd,now){
    const r=state.moneyReservations.find(x=>x.reservationId===cmd.reservationId);if(!r)return deny(state,cmd,"reservation-missing",now);
    if(r.owner!==cmd.owner)return deny(state,cmd,"owner-mismatch",now);if(r.state!=="RESERVED")return deny(state,cmd,"reservation-terminal",now);
    const actual=cmd.actualAmount===null||cmd.actualAmount===undefined?r.amount:cmd.actualAmount;if(actual>r.amount)return deny(state,cmd,"settlement-exceeds-reservation",now);
    const b=state.moneyAllocations.find(x=>x.allocationId===r.allocationId);if(!b||b.owner!==cmd.owner)return deny(state,cmd,"money-budget-missing",now);
    r.state="SETTLED";r.settledAmount=actual;r.updatedAt=now;b.spent+=actual;b.updatedAt=now;grant(state,cmd,"settled",now,{reservationId:r.reservationId,settledAmount:actual,spent:b.spent});
}
function releaseMoneyBudget(state,cmd,now){
    const i=state.moneyAllocations.findIndex(x=>x.allocationId===cmd.allocationId);if(i<0)return grant(state,cmd,"already-absent",now);
    const b=state.moneyAllocations[i];if(b.owner!==cmd.owner)return deny(state,cmd,"owner-mismatch",now);
    if(reserved(state,b.allocationId)>0)return deny(state,cmd,"active-reservations",now);
    state.moneyAllocations.splice(i,1);state.moneyReservations=state.moneyReservations.filter(x=>x.allocationId!==b.allocationId);grant(state,cmd,"released",now);
}
function reserved(state,id){return state.moneyReservations.filter(x=>x.allocationId===id&&x.state==="RESERVED").reduce((n,x)=>n+x.amount,0);}
function deny(state,cmd,reason,at,extra={}){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"DENIED",reason,allocationId:cmd.allocationId,owner:cmd.owner,at,...extra});}
function grant(state,cmd,reason,at,extra={}){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason,allocationId:cmd.allocationId,owner:cmd.owner,at,...extra});}
function decision(state,d){state.decisions.unshift(d);if(state.decisions.length>BUDGET_DECISION_LIMIT)state.decisions.length=BUDGET_DECISION_LIMIT;}
function persist(ns,state){state.generatedAt=Date.now();ns.write(BUDGET_STATE_PATH,JSON.stringify(state,null,2),"w");}
function load(ns){
    if(ns.fileExists(BUDGET_STATE_PATH,"home"))try{const v=JSON.parse(ns.read(BUDGET_STATE_PATH));if(validBudgetState(v)){if(v.schemaVersion===1){v.schemaVersion=2;v.moneyAllocations=[];v.moneyReservations=[];}return v;}}catch{}
    return {schemaVersion:2,kind:"resource-budget-state",owner:SERVICE,generatedAt:Date.now(),ramAllocations:[],moneyAllocations:[],moneyReservations:[],decisions:[]};
}
