export const EVIDENCE_PATH="data/validation/evidence.json";
export const MAX_EVIDENCE=80;

export function readEvidence(ns){
    if(!ns.fileExists(EVIDENCE_PATH,"home"))return {schemaVersion:1,records:[]};
    try{
        const value=JSON.parse(ns.read(EVIDENCE_PATH));
        return Array.isArray(value?.records)?value:{schemaVersion:1,records:[]};
    }catch{return {schemaVersion:1,records:[]};}
}
export function appendEvidence(ns,record){
    const store=readEvidence(ns);
    const records=[...store.records,record].slice(-MAX_EVIDENCE);
    ns.write(EVIDENCE_PATH,JSON.stringify({schemaVersion:1,records},null,2),"w");
}
export function evidenceRecord({testId,status,kind,summary,assertions=[],at=Date.now()}){
    return {schemaVersion:1,id:`${testId}-${at}`,testId,status,kind,summary,assertions,at};
}
