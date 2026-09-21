import { publishTelemetry, serviceEvent, serviceHealth } from "./telemetry.js";
import { PORTS } from "./ports.js";
import { CADENCE_DOMAINS, COLLECTION_CONTROL_STATE_PATH, validCadenceCommand } from "./collection-control.js";

const SERVICE="collection-control";
const LOOP_MS=250;
const BASELINES={player:2000,network:5000,market:6000,infrastructure:5000,capabilities:15000};
const MINIMUMS={player:500,network:1000,market:1000,infrastructure:1000,capabilities:5000};

export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | collection-control must run on home");return;}
    ns.disableLog("sleep");
    const startedAt=Date.now();
    const leases=loadLeases(ns);
    let lastSignature="";
    while(true){
        const now=Date.now();
        drain(ns,leases,now);
        for(const [id,lease] of leases) if(lease.expiresAt<=now) leases.delete(id);
        const state=buildState(leases,now);
        const signature=JSON.stringify(state.resolved);
        if(signature!==lastSignature){
            ns.write(COLLECTION_CONTROL_STATE_PATH,JSON.stringify(state,null,2),"w");
            publishTelemetry(ns,serviceEvent(ns,SERVICE,"info","CADENCE_RESOLVED","Collection cadence resolution changed.",{details:{resolved:state.resolved,leaseCount:state.leases.length}}));
            lastSignature=signature;
        } else {
            ns.write(COLLECTION_CONTROL_STATE_PATH,JSON.stringify(state,null,2),"w");
        }
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{health:"healthy",startedAt,phase:"resolving",staleAfterMs:3000,details:{leaseCount:state.leases.length,resolved:state.resolved}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,leases,now){
    const h=ns.getPortHandle(PORTS.COLLECTION_CONTROL);
    while(!h.empty()){
        let value; try{value=JSON.parse(h.read());}catch{continue;}
        if(!validCadenceCommand(value))continue;
        if(value.action==="release"){const current=leases.get(value.id);if(current?.owner===value.owner&&current?.domain===value.domain)leases.delete(value.id);continue;}
        if(value.expiresAt<=now)continue;
        leases.set(value.id,{id:value.id,owner:value.owner,domain:value.domain,intervalMs:value.intervalMs,createdAt:value.createdAt??now,expiresAt:value.expiresAt});
    }
}
function buildState(leases,now){
    const resolved={};
    for(const domain of CADENCE_DOMAINS){
        const active=[...leases.values()].filter(x=>x.domain===domain&&x.expiresAt>now);
        const requested=active.length?Math.min(...active.map(x=>x.intervalMs)):BASELINES[domain];
        resolved[domain]={baselineMs:BASELINES[domain],minimumMs:MINIMUMS[domain],intervalMs:Math.max(MINIMUMS[domain],Math.min(BASELINES[domain],requested)),activeLeaseCount:active.length};
    }
    return {schemaVersion:1,kind:"collection-cadence-state",owner:SERVICE,generatedAt:now,leases:[...leases.values()].sort((a,b)=>a.id.localeCompare(b.id)),resolved};
}
function loadLeases(ns){
    const map=new Map(), now=Date.now();
    try{const value=JSON.parse(ns.read(COLLECTION_CONTROL_STATE_PATH));for(const x of value?.leases??[])if(x?.id&&x.expiresAt>now)map.set(x.id,x);}catch{}
    return map;
}
