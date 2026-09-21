import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";
const DOMAINS=["player","network","market","infrastructure","capabilities"];
const CONVERGENCE_TIMEOUT_MS=3_000;
const CONVERGENCE_POLL_MS=100;
/** @param {NS} ns */
export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.canonical.state"), startedAt=Date.now(), assertions=[];
    const plan=readValidationPlan(ns), validationVersion=requiredValidationVersion(plan,testId)??1;
    const health=read(ns,"data/telemetry/health.json");
    check(assertions,"canonical-service",Boolean(health?.services?.some((s)=>s.service==="canonical-state"&&s.health==="healthy")),"Canonical-state service reports healthy.");
    for(const domain of DOMAINS){
        const matched=await waitForConvergence(ns,domain);
        const observation=matched.observation, state=matched.state;
        check(assertions,`state-${domain}`,state?.kind==="canonical-state"&&state?.domain===domain,`${domain} canonical state is present.`);
        check(assertions,`timestamp-${domain}`,matched.converged,`${domain} canonical observedAt converged to durable observation ${observation?.observedAt??"missing"} within ${CONVERGENCE_TIMEOUT_MS}ms.`);
        check(assertions,`revision-${domain}`,Number.isSafeInteger(state?.revision)&&state.revision>0,`${domain} canonical revision is positive.`);
        check(assertions,`canonicalized-after-observation-${domain}`,Number.isFinite(state?.canonicalizedAt)&&Number.isFinite(state?.observedAt)&&state.canonicalizedAt>=state.observedAt,`${domain} canonicalizedAt is not earlier than observedAt.`);
        check(assertions,`no-global-freshness-${domain}`,state&&!Object.hasOwn(state,"fresh")&&!Object.hasOwn(state,"freshUntil"),`${domain} canonical state carries no universal freshness label.`);
    }
    const status=assertions.every((x)=>x.pass)?"PASS":"FAIL", finishedAt=Date.now();
    const result={schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions};
    ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
    const record=evidenceRecord({testId,validationVersion,status,kind:"automated",summary:`${assertions.filter((x)=>x.pass).length}/${assertions.length} assertions passed.`,assertions,at:finishedAt});
    appendEvidence(ns,record);
    recordValidationResult(ns,{testId,validationVersion,status,evidenceId:record.id,kind:record.kind,summary:record.summary,at:finishedAt});
}
async function waitForConvergence(ns,domain){
    const deadline=Date.now()+CONVERGENCE_TIMEOUT_MS;
    let observation=null,state=null;
    do{
        observation=read(ns,`data/observations/${domain}.json`);
        state=read(ns,`data/state/${domain}.json`);
        if(Number.isFinite(observation?.observedAt)&&state?.observedAt===observation.observedAt)return {converged:true,observation,state};
        await ns.sleep(CONVERGENCE_POLL_MS);
    }while(Date.now()<deadline);
    observation=read(ns,`data/observations/${domain}.json`);
    state=read(ns,`data/state/${domain}.json`);
    return {converged:Number.isFinite(observation?.observedAt)&&state?.observedAt===observation.observedAt,observation,state};
}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
