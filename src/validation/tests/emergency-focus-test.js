import { appendEvidence, evidenceRecord } from "../evidence-store.js";
const RESULT_PATH="data/validation/latest-result.json";
const UI_PATH="data/validation/ui-state.json";
const HEALTH_PATH="data/telemetry/health.json";
const TARGETS=[
    ["player-collector","src/collectors/player-collector.js"],
    ["network-collector","src/collectors/network-collector.js"],
    ["market-collector","src/collectors/market-collector.js"],
    ["infrastructure-collector","src/collectors/infrastructure-collector.js"],
];
const EMERGENCY_TIMEOUT=35_000, ACK_TIMEOUT=90_000, RECOVERY_TIMEOUT=35_000;
/** @param {NS} ns */
export async function main(ns){
    ns.disableLog("ALL");
    const testId=String(ns.args[0]??"m2.dashboard.emergency-focus");
    const startedAt=Date.now(), assertions=[], captured=[], stopped=[];
    let restored=false, status="FAIL", summary="Emergency-focus validation did not complete.";
    ns.atExit(()=>{if(!restored)restore(ns,stopped);},"emergency-test-restore");
    try{
        const initial=read(ns,HEALTH_PATH);
        assert(assertions,"initial-health",healthySeven(initial),"Started from 7/7 healthy services.");
        if(!healthySeven(initial))throw new Error("Precondition failed: health is not 7/7 healthy.");
        for(const [service,script] of TARGETS){
            const p=ns.ps("home").find((x)=>x.filename===script);
            assert(assertions,`target-${service}`,Boolean(p),p?`${service} captured at pid ${p.pid}.`:`${service} is not running.`);
            if(!p)throw new Error(`Precondition failed: ${service} is not running.`);
            captured.push({service,script,host:"home",threads:p.threads,args:[...p.args],pid:p.pid});
        }
        for(const p of captured){
            if(!ns.kill(p.pid))throw new Error(`Could not stop ${p.service} pid ${p.pid}.`);
            stopped.push(p);
        }
        assert(assertions,"targets-stopped",stopped.length===4,`${stopped.length}/4 target collectors stopped by this test.`);
        const emergency=await waitFor(ns,()=>{const h=read(ns,HEALTH_PATH);return emergencyHealth(h)?h:null;},EMERGENCY_TIMEOUT);
        assert(assertions,"emergency-threshold",Boolean(emergency),emergency?"Health observed at least four unhealthy services.":"Emergency threshold was not observed before timeout.");
        if(!emergency)throw new Error("Emergency threshold timeout.");
        const ui=await waitFor(ns,()=>{const u=read(ns,UI_PATH);return u?.emergency?.focusedAt>=startedAt?u:null;},10_000);
        assert(assertions,"health-focus-event",Boolean(ui),ui?"Dashboard published automatic Health focus event.":"No automatic Health focus event observed.");
        if(!ui)throw new Error("Dashboard focus event timeout.");
        const focusCount=ui.emergency.focusCount;
        const ack=await waitFor(ns,()=>{const u=read(ns,UI_PATH);return u?.emergency?.acknowledgedAt>=startedAt?u:null;},ACK_TIMEOUT);
        assert(assertions,"operator-acknowledged",Boolean(ack),ack?"Dashboard acknowledgement observed.":"Operator acknowledgement timed out.");
        if(!ack)throw new Error("Operator acknowledgement timeout.");
        await ns.sleep(3_000);
        const afterAck=read(ns,UI_PATH);
        assert(assertions,"one-shot-focus",afterAck?.emergency?.focusCount===focusCount,`Focus count remained ${focusCount} after acknowledgement.`);
        restored=restore(ns,stopped);
        assert(assertions,"restore-launched",restored,"Every collector stopped by the test was relaunched.");
        const recovered=await waitFor(ns,()=>{const h=read(ns,HEALTH_PATH);return healthySeven(h)?h:null;},RECOVERY_TIMEOUT);
        assert(assertions,"final-health",Boolean(recovered),recovered?"Health returned to 7/7 healthy.":"Health did not return to 7/7 before timeout.");
        status=assertions.every((x)=>x.pass)?"PASS":"FAIL";
        summary=status==="PASS"?"Emergency threshold, one-shot focus, acknowledgement, and full recovery passed.":"One or more emergency-focus assertions failed.";
    }catch(error){
        summary=String(error?.message??error);
        if(!restored){restored=restore(ns,stopped);assert(assertions,"recovery-after-failure",restored,"Failure path attempted restoration of all stopped collectors.");}
    }finally{
        if(!restored)restored=restore(ns,stopped);
        const finishedAt=Date.now();
        const result={schemaVersion:1,testId,status,startedAt,finishedAt,assertions,summary};
        ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
        appendEvidence(ns,evidenceRecord({testId,status,kind:"automated",summary,assertions,at:finishedAt}));
    }
}
function restore(ns,items){
    let ok=true;
    for(const p of items){
        const already=ns.ps(p.host).some((x)=>x.filename===p.script&&sameArgs(x.args,p.args));
        if(already)continue;
        const pid=ns.exec(p.script,p.host,{threads:p.threads,preventDuplicates:true},...p.args);
        if(pid===0)ok=false;
    }
    return ok;
}
async function waitFor(ns,fn,timeout){const end=Date.now()+timeout;while(Date.now()<end){const value=fn();if(value)return value;await ns.sleep(250);}return null;}
function healthySeven(h){return h?.serviceCount===7&&h?.overall==="healthy"&&(h?.services??[]).every((s)=>s.health==="healthy");}
function emergencyHealth(h){const bad=(h?.services??[]).filter((s)=>s.health!=="healthy").length;return h?.overall==="failed"||(h?.serviceCount>=4&&bad>=Math.ceil(h.serviceCount/2));}
function sameArgs(a,b){return JSON.stringify(a??[])===JSON.stringify(b??[]);}
function assert(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
