import { publishTelemetry, serviceHealth, serviceRetirement } from "../../core/telemetry.js";

const SERVICE="validation-diagnostic-fixture";
const CONTROL_PATH="data/validation/diagnostic-fixture-control.json";

/** Validation-only persistent fixture. It deliberately stops heartbeating when armed. */
export async function main(ns){
    if(ns.getHostname()!=="home")return;
    ns.disableLog("sleep");
    const startedAt=Date.now();
    while(true){
        const control=read(ns,CONTROL_PATH);
        if(control?.mode==="retire"){
            publishTelemetry(ns,serviceRetirement(ns,SERVICE,{reason:"validation-complete"}));
            return;
        }
        if(control?.mode==="fail"){
            // Real runtime-health failure: remain alive but deliberately stop reporting
            // until the validation driver requests recovery.
            await ns.sleep(250);
            continue;
        }
        publishTelemetry(ns,serviceHealth(ns,SERVICE,{startedAt,phase:"validation-fixture",staleAfterMs:1500,details:{validationOnly:true}}));
        await ns.sleep(250);
    }
}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
