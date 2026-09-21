export const VALIDATION_PLAN_PATH="src/validation/validation-plan.json";
export const VALIDATION_LEDGER_PATH="data/validation/ledger.json";

export function readValidationPlan(ns){
    const value=readJson(ns,VALIDATION_PLAN_PATH,null);
    return validPlan(value)?value:{schemaVersion:1,milestone:{id:"unknown",title:"Validation plan unavailable"},groups:[]};
}

export function readValidationLedger(ns){
    const value=readJson(ns,VALIDATION_LEDGER_PATH,null);
    return value?.schemaVersion===1&&value.entries&&typeof value.entries==="object"
        ?value:{schemaVersion:1,updatedAt:null,entries:{}};
}

export function recordValidationResult(ns,{testId,validationVersion,status,evidenceId=null,kind=null,summary=null,at=Date.now()}){
    if(typeof testId!=="string"||!testId||!Number.isSafeInteger(validationVersion)||validationVersion<1)return false;
    const ledger=readValidationLedger(ns);
    ledger.entries[testId]={testId,validationVersion,status,at,evidenceId,kind,summary};
    ledger.updatedAt=at;
    ns.write(VALIDATION_LEDGER_PATH,JSON.stringify(ledger,null,2),"w");
    return true;
}

export function reconcileValidation(plan,ledger){
    const groups=(plan?.groups??[]).map((group)=>{
        const requirements=(group.requirements??[]).map((requirement)=>{
            const entry=ledger?.entries?.[requirement.testId]??null;
            const validated=entry?.status==="PASS"&&entry.validationVersion===requirement.validationVersion;
            return {...requirement,validated,ledgerEntry:entry};
        });
        return {...group,requirements,validated:requirements.length>0&&requirements.every((x)=>x.validated)};
    });
    return {groups,validating:groups.filter((x)=>!x.validated),validated:groups.filter((x)=>x.validated)};
}

export function validationSummaryFrom(plan,ledger){
    const state=reconcileValidation(plan,ledger);
    const all=state.groups.flatMap((g)=>g.requirements);
    return {
        validatedGroups:state.validated.length,
        validatingGroups:state.validating.length,
        validatedChecks:all.filter((x)=>x.validated).length,
        validatingChecks:all.filter((x)=>!x.validated).length,
    };
}

export function outstandingTestIds(plan,ledger){
    const state=reconcileValidation(plan,ledger);
    return [...new Set(state.validating.flatMap((g)=>g.requirements.filter((r)=>!r.validated).map((r)=>r.testId)))];
}

export function requiredValidationVersion(plan,testId){
    const versions=(plan?.groups??[]).flatMap((g)=>g.requirements??[]).filter((r)=>r.testId===testId).map((r)=>r.validationVersion);
    return versions.length?Math.max(...versions):null;
}

function validPlan(value){
    return Boolean(value&&value.schemaVersion===1&&Array.isArray(value.groups)&&value.groups.every((g)=>typeof g.id==="string"&&Array.isArray(g.requirements)&&g.requirements.every((r)=>typeof r.id==="string"&&typeof r.testId==="string"&&Number.isSafeInteger(r.validationVersion)&&r.validationVersion>0)));
}
function readJson(ns,path,fallback){if(!ns.fileExists(path,"home"))return fallback;try{return JSON.parse(ns.read(path));}catch{return fallback;}}
