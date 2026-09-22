import { PORTS } from "./ports.js";
import { WORK_ORDER_STATE_PATH } from "./work-orders.js";
import { EXECUTION_QUEUE_LIMIT, EXECUTION_STATE_PATH, activeExecution, validExecutionCommand } from "./execution-scheduler.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="execution-scheduler", LOOP_MS=200, DECISION_LIMIT=80, HOME_RESERVE_GB=8;

export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | execution-scheduler must run on home");return;}
    ns.disableLog("sleep");
    const startedAt=Date.now(),state=load(ns);
    reconcile(ns,state,Date.now());persist(ns,state);
    while(true){
        const now=Date.now(),changed=drain(ns,state,now)|reconcile(ns,state,now)|admit(ns,state,now);
        if(changed)persist(ns,state);
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"scheduling",staleAfterMs:3000,details:{
            queued:state.executions.filter(x=>x.state==="REQUESTED").length,
            running:state.executions.filter(x=>x.state==="RUNNING").length,
            reservedRam:sumReserved(state),
        }}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,state,now){
    const h=ns.getPortHandle(PORTS.EXECUTION_SCHEDULER);let changed=0;
    while(!h.empty()){
        let cmd;try{cmd=JSON.parse(h.read());}catch{continue;}
        if(!validExecutionCommand(cmd)){decision(state,{requestId:cmd?.requestId??"invalid",action:cmd?.action??"invalid",outcome:"DENIED",reason:"invalid-command",at:now});changed=1;continue;}
        if(state.decisions.some(x=>x.requestId===cmd.requestId))continue;
        if(cmd.action==="request")request(ns,state,cmd,now);
        if(cmd.action==="cancel")cancel(ns,state,cmd,now);
        changed=1;
    }
    return changed;
}
function request(ns,state,cmd,now){
    if(state.executions.some(x=>x.executionId===cmd.executionId)){decision(state,{requestId:cmd.requestId,action:"request",outcome:"DENIED",reason:"execution-id-in-use",executionId:cmd.executionId,at:now});return;}
    if(state.executions.filter(x=>x.state==="REQUESTED").length>=EXECUTION_QUEUE_LIMIT){decision(state,{requestId:cmd.requestId,action:"request",outcome:"DENIED",reason:"queue-full",executionId:cmd.executionId,at:now});return;}
    const order=findOrder(ns,cmd.workOrderId);
    const reason=orderProblem(order,cmd,now);
    if(reason){decision(state,{requestId:cmd.requestId,action:"request",outcome:"DENIED",reason,executionId:cmd.executionId,at:now});return;}
    const scriptRam=ns.getScriptRam(cmd.script,"home");
    if(!(scriptRam>0)){decision(state,{requestId:cmd.requestId,action:"request",outcome:"DENIED",reason:"script-unavailable",executionId:cmd.executionId,at:now});return;}
    const expiresAt=Math.min(now+cmd.ttlMs,order.expiresAt);
    if(expiresAt<=now){decision(state,{requestId:cmd.requestId,action:"request",outcome:"DENIED",reason:"work-order-expired",executionId:cmd.executionId,at:now});return;}
    state.executions.push({schemaVersion:1,kind:"execution-lease",executionId:cmd.executionId,requestId:cmd.requestId,workOrderId:cmd.workOrderId,receiver:cmd.receiver,correlationId:cmd.correlationId,script:cmd.script,args:cmd.args,threads:cmd.threads,ramRequired:scriptRam*cmd.threads,host:null,pid:0,state:"REQUESTED",createdAt:now,updatedAt:now,expiresAt,terminalReason:null});
    decision(state,{requestId:cmd.requestId,action:"request",outcome:"QUEUED",reason:"accepted",executionId:cmd.executionId,expiresAt,at:now});
}
function admit(ns,state,now){
    let changed=0;
    for(const e of state.executions.filter(x=>x.state==="REQUESTED").sort((a,b)=>a.createdAt-b.createdAt||a.executionId.localeCompare(b.executionId))){
        const order=findOrder(ns,e.workOrderId),problem=orderProblem(order,e,now);
        if(problem){terminal(e,"FAILED",problem,now);changed=1;continue;}
        if(e.expiresAt<=now){terminal(e,"EXPIRED","execution-expired",now);changed=1;continue;}
        const available=Math.max(0,ns.getServerMaxRam("home")-ns.getServerUsedRam("home")-HOME_RESERVE_GB);
        if(available<e.ramRequired)continue;
        e.state="RESERVED";e.host="home";e.updatedAt=now;changed=1;
        const pid=ns.exec(e.script,"home",e.threads,...e.args);
        if(pid<=0){terminal(e,"FAILED","launch-failed",Date.now());continue;}
        e.pid=pid;e.state="RUNNING";e.updatedAt=Date.now();
    }
    return changed;
}
function reconcile(ns,state,now){
    let changed=0;
    for(const e of state.executions){
        if(!activeExecution(e)&&e.state!=="REQUESTED")continue;
        const order=findOrder(ns,e.workOrderId);
        if(e.state==="REQUESTED"){
            if(e.expiresAt<=now){terminal(e,"EXPIRED","execution-expired",now);changed=1;}
            else if(orderProblem(order,e,now)){terminal(e,"FAILED","work-order-invalid",now);changed=1;}
            continue;
        }
        const running=e.pid>0&&e.host&&ns.isRunning(e.pid,e.host);
        if(e.state==="RESERVED"){if(!running){terminal(e,"FAILED","reserved-process-missing",now);changed=1;}continue;}
        if(e.state==="RUNNING"){
            if(!running){terminal(e,"COMPLETE","process-exited",now);changed=1;continue;}
            if(!order||order.state!=="ACTIVE"||order.receiver!==e.receiver||order.correlationId!==e.correlationId||e.expiresAt<=now){e.state="DRAINING";e.updatedAt=now;changed=1;}
        }
        if(e.state==="DRAINING"&&!running){terminal(e,"COMPLETE","drained",now);changed=1;}
        if(e.state==="DRAINING"&&e.expiresAt<=now&&running){ns.kill(e.pid,e.host);terminal(e,"EXPIRED","execution-expired",now);changed=1;}
    }
    return changed;
}
function cancel(ns,state,cmd,now){
    const e=state.executions.find(x=>x.executionId===cmd.executionId);
    if(!e){decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"GRANTED",reason:"already-absent",executionId:cmd.executionId,at:now});return;}
    if(cmd.actor!==e.receiver){decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"DENIED",reason:"actor-mismatch",executionId:cmd.executionId,at:now});return;}
    if(activeExecution(e)&&e.pid>0&&e.host&&ns.isRunning(e.pid,e.host))ns.kill(e.pid,e.host);
    if(activeExecution(e)||e.state==="REQUESTED")terminal(e,"CANCELLED","requested",now);
    decision(state,{requestId:cmd.requestId,action:"cancel",outcome:"GRANTED",reason:e.state.toLowerCase(),executionId:cmd.executionId,at:now});
}
function orderProblem(order,cmd,now){
    if(!order)return "work-order-not-found";
    if(order.state!=="ACTIVE")return "work-order-not-active";
    if(order.receiver!==cmd.receiver)return "receiver-mismatch";
    if(order.correlationId!==cmd.correlationId)return "correlation-mismatch";
    if(!Number.isFinite(order.expiresAt)||order.expiresAt<=now)return "work-order-expired";
    return null;
}
function findOrder(ns,id){const s=read(ns,WORK_ORDER_STATE_PATH);return s?.orders?.find(x=>x.workOrderId===id)??null;}
function terminal(e,state,reason,now){e.state=state;e.terminalReason=reason;e.updatedAt=now;e.host=e.host??null;}
function sumReserved(state){return state.executions.filter(activeExecution).reduce((n,e)=>n+(Number(e.ramRequired)||0),0);}
function decision(state,d){state.decisions.unshift(d);if(state.decisions.length>DECISION_LIMIT)state.decisions.length=DECISION_LIMIT;}
function persist(ns,state){state.generatedAt=Date.now();ns.write(EXECUTION_STATE_PATH,JSON.stringify(state,null,2),"w");}
function load(ns){if(ns.fileExists(EXECUTION_STATE_PATH,"home"))try{const v=JSON.parse(ns.read(EXECUTION_STATE_PATH));if(v?.schemaVersion===1&&v?.kind==="execution-scheduler-state"&&v?.owner===SERVICE&&Array.isArray(v.executions)&&Array.isArray(v.decisions))return v;}catch{}return {schemaVersion:1,kind:"execution-scheduler-state",owner:SERVICE,generatedAt:Date.now(),executions:[],decisions:[]};}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
