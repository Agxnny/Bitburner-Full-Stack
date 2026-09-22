import { DIAGNOSTICS_STATE_PATH } from "../../core/diagnostics.js";
import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";

const RESULT_PATH="data/validation/latest-result.json";
const CONTROL_PATH="data/validation/diagnostic-fixture-control.json";
const FIXTURE="src/validation/fixtures/diagnostic-failure-fixture.js";
const SERVICE="validation-diagnostic-fixture";
const INCIDENT="health:"+SERVICE;

export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.diagnostics.failure-correlation"),startedAt=Date.now(),assertions=[];
    const version=requiredValidationVersion(readValidationPlan(ns),testId)??1;
    let pid=0;
    try{
        ns.write(CONTROL_PATH,JSON.stringify({schemaVersion:1,mode:"healthy",updatedAt:Date.now()}),"w");
        pid=ns.run(FIXTURE,{threads:1,preventDuplicates:true});
        check(assertions,"fixture-started",pid>0,"Validation-only fixture started without stopping any production service.");
        const healthy=await waitHealth(ns,"healthy",5000);
        check(assertions,"fixture-healthy",healthy?.health==="healthy","Health owner observed the fixture as healthy before disruption.");

        ns.write(CONTROL_PATH,JSON.stringify({schemaVersion:1,mode:"fail",updatedAt:Date.now()}),"w");
        const degraded=await waitHealth(ns,"stale",7000);
        check(assertions,"real-health-failure",degraded?.health==="stale","Fixture remained alive but stopped heartbeating until health marked the real service state stale.");

        const active=await waitIncident(ns,"active",5000);
        check(assertions,"incident-correlated",active?.classification==="OBSERVED"&&active?.source==="health","Diagnostics created an OBSERVED incident from the actual health failure.");
        const healthEvidence=(active?.evidence??[]).find(x=>x.type==="service-health");
        check(assertions,"failure-evidence",healthEvidence?.service===SERVICE&&healthEvidence?.health==="stale"&&Number.isFinite(healthEvidence?.pid),"Incident identifies the affected fixture, stale state, and runtime PID from health evidence.");
        check(assertions,"explanation-bounded",active?.code==="SERVICE_STALE"&&!String(active?.message??"").toLowerCase().includes("syntax"),"Explanation reports the observed stale heartbeat without inventing an unsupported root cause.");

        ns.write(CONTROL_PATH,JSON.stringify({schemaVersion:1,mode:"healthy",updatedAt:Date.now()}),"w");
        const recovered=await waitHealth(ns,"healthy",5000);
        check(assertions,"fixture-recovered",recovered?.health==="healthy","Fixture resumed heartbeats and health returned to healthy.");

        const resolved=await waitIncident(ns,"resolved",5000);
        check(assertions,"incident-resolved",resolved?.status==="resolved"&&Number.isFinite(resolved?.resolvedAt),"Diagnostics automatically resolved the incident after observed service recovery while preserving its evidence.");

        ns.write(CONTROL_PATH,JSON.stringify({schemaVersion:1,mode:"retire",updatedAt:Date.now()}),"w");
        const retired=await waitAbsentHealth(ns,5000);
        check(assertions,"fixture-retired",retired,"Fixture explicitly retired itself and Health removed the intentional ephemeral instance.");
        await ns.sleep(2000);
        const post=read(ns,"data/telemetry/health.json"),postIncident=(read(ns,DIAGNOSTICS_STATE_PATH)?.incidents??[]).find(v=>v.id===INCIDENT);
        check(assertions,"teardown-clean",!(post?.services??[]).some(x=>x.service===SERVICE)&&postIncident?.status==="resolved","After retirement, the fixture stays absent from Health and its diagnostic incident stays resolved.");
    }finally{
        ns.write(CONTROL_PATH,JSON.stringify({schemaVersion:1,mode:"retire",updatedAt:Date.now()}),"w");
        await ns.sleep(750);
        if(pid>0&&ns.isRunning(pid,"home"))ns.kill(pid);
    }
    const status=assertions.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=assertions.filter(x=>x.pass).length+"/"+assertions.length+" assertions passed.";
    ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion:version,status,startedAt,finishedAt,assertions,summary},null,2),"w");
    const ev=evidenceRecord({testId,validationVersion:version,status,kind:"automated",summary,assertions,at:finishedAt});appendEvidence(ns,ev);recordValidationResult(ns,{testId,validationVersion:version,status,evidenceId:ev.id,kind:ev.kind,summary:ev.summary,at:finishedAt});
}
async function waitHealth(ns,want,timeout){const end=Date.now()+timeout;while(Date.now()<end){const h=read(ns,"data/telemetry/health.json"),s=(h?.services??[]).find(x=>x.service===SERVICE);if(s?.health===want)return s;await ns.sleep(100);}return (read(ns,"data/telemetry/health.json")?.services??[]).find(x=>x.service===SERVICE);}
async function waitAbsentHealth(ns,timeout){const end=Date.now()+timeout;while(Date.now()<end){const found=(read(ns,"data/telemetry/health.json")?.services??[]).some(x=>x.service===SERVICE);if(!found)return true;await ns.sleep(100);}return false;}
async function waitIncident(ns,want,timeout){const end=Date.now()+timeout;while(Date.now()<end){const x=(read(ns,DIAGNOSTICS_STATE_PATH)?.incidents??[]).find(v=>v.id===INCIDENT);if(x?.status===want)return x;await ns.sleep(100);}return (read(ns,DIAGNOSTICS_STATE_PATH)?.incidents??[]).find(v=>v.id===INCIDENT);}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
