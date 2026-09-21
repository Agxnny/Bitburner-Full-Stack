const RESULT_PATH="data/validation/latest-result.json";
const REQUIRED=["player","network","market","infrastructure","capabilities"];
/** @param {NS} ns */
export async function main(ns){
    const id=String(ns.args[0]??"m2.dashboard.smoke");
    const startedAt=Date.now();
    const assertions=[];
    check(assertions,"dashboard-running",ns.ps("home").some((p)=>p.filename==="src/ui/validation-dashboard.jsx"),"Validation Dashboard process is running.");
    const health=read(ns,"data/telemetry/health.json");
    check(assertions,"health-available",Boolean(health),"Health snapshot is readable.");
    check(assertions,"health-services",Number(health?.serviceCount)>=7,`${health?.serviceCount??0} services are reporting.`);
    const update=read(ns,"data/update-status.json");
    check(assertions,"updater-available",Boolean(update),"Update Watcher status is readable.");
    for(const domain of REQUIRED){
        const value=read(ns,`data/observations/${domain}.json`);
        check(assertions,`observation-${domain}`,Boolean(value)&&Number.isFinite(value.freshUntil)&&Date.now()<=value.freshUntil,`${domain} observation is present and fresh.`);
    }
    const passed=assertions.every((x)=>x.pass);
    const result={schemaVersion:1,testId:id,status:passed?"PASS":"FAIL",startedAt,finishedAt:Date.now(),assertions};
    ns.write(RESULT_PATH,JSON.stringify(result,null,2),"w");
}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
