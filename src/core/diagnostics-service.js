import { PORTS } from "./ports.js";
import { DIAGNOSTICS_STATE_PATH, validDiagnosticCommand } from "./diagnostics.js";
import { publishTelemetry, serviceHealth } from "./telemetry.js";

const SERVICE="diagnostics-service";
const LOOP_MS=500;
const LIMIT=80;
const REPORT_PATH="data/git-pull-report.json";
const HEALTH_PATH="data/telemetry/health.json";

export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | diagnostics-service must run on home");return;}
    ns.disableLog("sleep");
    const startedAt=Date.now(), incidents=load(ns);
    while(true){
        const now=Date.now();
        drain(ns,incidents,now);
        correlateDeployment(ns,incidents,now);
        correlateHealth(ns,incidents,now);
        const values=[...incidents.values()].sort((a,b)=>b.lastSeenAt-a.lastSeenAt).slice(0,LIMIT);
        ns.write(DIAGNOSTICS_STATE_PATH,JSON.stringify({schemaVersion:1,kind:"diagnostics-state",owner:SERVICE,generatedAt:now,activeCount:values.filter(x=>x.status==="active").length,incidents:values},null,2),"w");
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"correlating",staleAfterMs:5000,details:{activeIncidents:values.filter(x=>x.status==="active").length}}));
        await ns.sleep(LOOP_MS);
    }
}
function drain(ns,map,now){
    const h=ns.getPortHandle(PORTS.DIAGNOSTICS);
    while(!h.empty()){
        let v;try{v=JSON.parse(h.read());}catch{continue;}
        if(!validDiagnosticCommand(v))continue;
        if(v.action==="resolve"){const x=map.get(v.id);if(x){x.status="resolved";x.resolvedAt=v.at;x.lastSeenAt=v.at;}continue;}
        upsert(map,{id:v.id,source:v.source,code:v.code,message:v.message,severity:v.severity,classification:v.classification,confidence:v.confidence,correlationId:v.correlationId??null,evidence:v.evidence,details:v.details??null},v.at);
    }
}
function correlateDeployment(ns,map,now){
    const r=read(ns,REPORT_PATH); if(!r||r.success!==false||!Number.isSafeInteger(Number(r?.remote?.revision)))return;
    const rev=Number(r.remote.revision), failed=(r.runtime?.units??[]).filter(x=>x.outcome==="failed");
    const evidence=[{type:"deployment",revision:rev,status:r.status,error:r.error??null}];
    for(const x of failed)evidence.push({type:"runtime-unit",id:x.id,script:x.script,error:x.error,changed:Boolean(x.changed),handledAt:x.handledAt});
    const changed=(r.files??[]).filter(x=>["updated","added","refreshed"].includes(x.action??x.status)).map(x=>x.target).filter(Boolean);
    if(changed.length)evidence.push({type:"changed-files",files:changed.slice(0,20)});
    const message=failed.length
      ? `Deployment r${rev} committed but ${failed.length} persistent runtime unit(s) failed reconciliation.`
      : `Deployment r${rev} reported failure: ${r.error??r.status}.`;
    upsert(map,{id:`deployment:r${rev}`,source:"deployment",code:"DEPLOYMENT_DEGRADED",message,severity:"error",classification:"CORRELATED",confidence:failed.length?"high":"medium",correlationId:`deployment:r${rev}`,evidence,details:{failedUnits:failed.map(x=>x.id)}},r.finishedAt??now);
}
function correlateHealth(ns,map,now){
    const h=read(ns,HEALTH_PATH); if(!Array.isArray(h?.services))return;
    for(const s of h.services){
        const id=`health:${s.service}`;
        if(s.health==="healthy"){const x=map.get(id);if(x?.status==="active"){x.status="resolved";x.resolvedAt=now;x.lastSeenAt=now;}continue;}
        upsert(map,{id,source:"health",code:`SERVICE_${String(s.health).toUpperCase()}`,message:`${s.service} is ${s.health}: ${s.reason??"no healthy heartbeat/status"}`,severity:s.health==="failed"?"error":"warning",classification:"OBSERVED",confidence:"high",correlationId:null,evidence:[{type:"service-health",service:s.service,instanceId:s.instanceId,host:s.host,pid:s.pid,health:s.health,reason:s.reason,heartbeatAt:s.heartbeatAt}],details:null},now);
    }
}
function upsert(map,next,at){
    const old=map.get(next.id);
    if(old&&old.status==="active"){
        const same=old.code===next.code&&old.message===next.message&&JSON.stringify(old.evidence)===JSON.stringify(next.evidence);
        old.lastSeenAt=at; if(!same){old.occurrences+=1;old.code=next.code;old.message=next.message;old.evidence=next.evidence;old.details=next.details;old.classification=next.classification;old.confidence=next.confidence;old.severity=next.severity;} return;
    }
    map.set(next.id,{...next,status:"active",firstSeenAt:at,lastSeenAt:at,resolvedAt:null,occurrences:(old?.occurrences??0)+1});
}
function load(ns){
    const map=new Map(),v=read(ns,DIAGNOSTICS_STATE_PATH);
    for(const x of v?.incidents??[])if(x?.id)map.set(x.id,x);
    return map;
}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
