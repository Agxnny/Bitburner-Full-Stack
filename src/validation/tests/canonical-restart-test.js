import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
const RESULT_PATH="data/validation/latest-result.json";
const SERVICE="src/core/canonical-state-service.js";
const DOMAINS=["player","network","market","infrastructure","capabilities"];
/** @param {NS} ns */
export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m3.canonical.restart"), startedAt=Date.now(), assertions=[];
    const plan=readValidationPlan(ns), validationVersion=requiredValidationVersion(plan,testId)??1;
    let original=null,restartedPid=0,status="FAIL",summary="Restart reconciliation did not complete.";
    try{
        original=ns.ps("home").find((p)=>p.filename===SERVICE);
        check(assertions,"service-running",Boolean(original),original?`Captured canonical service pid ${original.pid}.`:"Canonical service is not running.");
        if(!original)throw new Error("Precondition failed: canonical service is not running.");
        const before=Object.fromEntries(DOMAINS.map((d)=>[d,read(ns,`data/state/${d}.json`)]));
        if(!ns.kill(original.pid))throw new Error(`Could not stop canonical service pid ${original.pid}.`);
        await ns.sleep(250);
        restartedPid=ns.exec(SERVICE,"home",{threads:original.threads,preventDuplicates:true},...original.args);
        check(assertions,"service-restarted",restartedPid>0,restartedPid?`Canonical service restarted at pid ${restartedPid}.`:"Canonical service restart failed.");
        if(!restartedPid)throw new Error("Canonical service restart failed.");
        await ns.sleep(2_000);
        for(const domain of DOMAINS){
            const observation=read(ns,`data/observations/${domain}.json`), state=read(ns,`data/state/${domain}.json`);
            check(assertions,`reconciled-${domain}`,Boolean(state)&&state.observedAt===observation?.observedAt&&state.revision>=(before[domain]?.revision??0),`${domain} canonical state reconciled from durable observation without revision rollback.`);
        }
        status=assertions.every((x)=>x.pass)?"PASS":"FAIL";
        summary=status==="PASS"?"Canonical state restarted and reconciled all five durable observations.":"One or more restart reconciliation assertions failed.";
    }catch(error){summary=String(error?.message??error);}
    finally{
        if(!ns.ps("home").some((p)=>p.filename===SERVICE))restartedPid=ns.exec(SERVICE,"home",{threads:original?.threads??1,preventDuplicates:true},...(original?.args??[]));
        const finishedAt=Date.now();
        const result={schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions,summary};
        ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
        const record=evidenceRecord({testId,validationVersion,status,kind:"automated",summary,assertions,at:finishedAt});
        appendEvidence(ns,record);
        recordValidationResult(ns,{testId,validationVersion,status,evidenceId:record.id,kind:record.kind,summary:record.summary,at:finishedAt});
    }
}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
