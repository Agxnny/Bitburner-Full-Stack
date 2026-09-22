import { PORTS } from "./ports.js";
import { BUDGET_DECISION_LIMIT, BUDGET_STATE_PATH, validBudgetCommand, validBudgetState } from "./resource-budgets.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="resource-budget-manager",LOOP_MS=200;
export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | resource-budget-manager must run on home");return;}
    ns.disableLog("sleep");const startedAt=Date.now(),state=load(ns);persist(ns,state);
    while(true){
        const changed=drain(ns,state,Date.now());if(changed)persist(ns,state);
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"allocating",staleAfterMs:3000,details:{ramAllocations:state.ramAllocations.length,allocatedRamGb:state.ramAllocations.reduce((n,x)=>n+x.limitGb,0),decisions:state.decisions.length}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,state,now){
    const h=ns.getPortHandle(PORTS.RESOURCE_BUDGETS);let changed=0;
    while(!h.empty()){
        let cmd;try{cmd=JSON.parse(h.read());}catch{continue;}
        if(!validBudgetCommand(cmd)){decision(state,{requestId:cmd?.requestId??"invalid",action:cmd?.action??"invalid",outcome:"DENIED",reason:"invalid-command",at:now});changed=1;continue;}
        if(state.decisions.some(x=>x.requestId===cmd.requestId))continue;
        if(cmd.action==="set-ram")setRam(state,cmd,now);
        else releaseRam(state,cmd,now);
        changed=1;
    }
    return changed;
}
function setRam(state,cmd,now){
    const byId=state.ramAllocations.find(x=>x.allocationId===cmd.allocationId),byOwner=state.ramAllocations.find(x=>x.owner===cmd.owner);
    if(byId&&byId.owner!==cmd.owner){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"DENIED",reason:"allocation-id-in-use",allocationId:cmd.allocationId,at:now});return;}
    if(byOwner&&byOwner.allocationId!==cmd.allocationId){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"DENIED",reason:"owner-already-allocated",allocationId:cmd.allocationId,at:now});return;}
    const current=byId??byOwner;
    if(current){current.limitGb=cmd.limitGb;current.correlationId=cmd.correlationId;current.updatedAt=now;}
    else state.ramAllocations.push({schemaVersion:1,kind:"ram-budget",allocationId:cmd.allocationId,owner:cmd.owner,limitGb:cmd.limitGb,correlationId:cmd.correlationId,createdAt:now,updatedAt:now});
    decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:current?"updated":"allocated",allocationId:cmd.allocationId,owner:cmd.owner,limitGb:cmd.limitGb,at:now});
}
function releaseRam(state,cmd,now){
    const i=state.ramAllocations.findIndex(x=>x.allocationId===cmd.allocationId);
    if(i<0){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:"already-absent",allocationId:cmd.allocationId,at:now});return;}
    if(state.ramAllocations[i].owner!==cmd.owner){decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"DENIED",reason:"owner-mismatch",allocationId:cmd.allocationId,at:now});return;}
    state.ramAllocations.splice(i,1);decision(state,{requestId:cmd.requestId,action:cmd.action,outcome:"GRANTED",reason:"released",allocationId:cmd.allocationId,owner:cmd.owner,at:now});
}
function decision(state,d){state.decisions.unshift(d);if(state.decisions.length>BUDGET_DECISION_LIMIT)state.decisions.length=BUDGET_DECISION_LIMIT;}
function persist(ns,state){state.generatedAt=Date.now();ns.write(BUDGET_STATE_PATH,JSON.stringify(state,null,2),"w");}
function load(ns){if(ns.fileExists(BUDGET_STATE_PATH,"home"))try{const v=JSON.parse(ns.read(BUDGET_STATE_PATH));if(validBudgetState(v))return v;}catch{}return {schemaVersion:1,kind:"resource-budget-state",owner:SERVICE,generatedAt:Date.now(),ramAllocations:[],decisions:[]};}
