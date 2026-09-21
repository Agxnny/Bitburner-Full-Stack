import { appendEvidence, evidenceRecord } from "../evidence-store.js";
import { readValidationPlan, recordValidationResult, requiredValidationVersion } from "../validation-state.js";
import { canonicalStatePath, validCanonicalState } from "../../core/state-contract.js";
const RESULT_PATH="data/validation/latest-result.json";
export async function main(ns){
 ns.disableLog("ALL"); const testId=String(ns.args[0]??"m3.resource.associations"), startedAt=Date.now(), assertions=[];
 const plan=readValidationPlan(ns), validationVersion=requiredValidationVersion(plan,testId)??1;
 const network=read(ns,canonicalStatePath("network")), market=read(ns,canonicalStatePath("market")), assoc=read(ns,canonicalStatePath("associations"));
 check(assertions,"canonical-state",validCanonicalState(assoc)&&assoc.domain==="associations"&&assoc.availability==="available","Canonical associations state is present and available.");
 check(assertions,"source-provenance",assoc?.data?.source?.network?.revision===network?.revision&&assoc?.data?.source?.market?.revision===market?.revision&&assoc?.observedAt===Math.min(network?.observedAt??Infinity,market?.observedAt??Infinity),"Association provenance identifies the current network/market revisions and preserves the older source timestamp.");
 const servers=new Map((network?.data?.servers??[]).map(x=>[x.hostname,x.organizationName]));
 const stocks=new Map((market?.data?.symbols??[]).map(x=>[x.symbol,x.organization]));
 const links=assoc?.data?.associations??[];
 check(assertions,"exact-organizations",links.every(x=>stocks.get(x.symbol)===x.organization&&servers.get(x.hostname)===x.organization),"Every emitted link uses exact organization equality across canonical stock and server facts.");
 check(assertions,"no-invented-resources",links.every(x=>stocks.has(x.symbol)&&servers.has(x.hostname)),"Every linked stock symbol and hostname exists in its canonical source domain.");
 const keys=links.map(x=>`${x.symbol}\u0000${x.hostname}`);
 check(assertions,"unique-links",new Set(keys).size===keys.length,"No duplicate stock/server association pairs were emitted.");
 const unmatchedStocks=assoc?.data?.unmatchedStocks??[], unmatchedServers=assoc?.data?.unmatchedServers??[];
 check(assertions,"explicit-unmatched",unmatchedStocks.every(x=>stocks.get(x.symbol)===x.organization&&!links.some(y=>y.symbol===x.symbol))&&unmatchedServers.every(x=>servers.get(x.hostname)===x.organization&&!links.some(y=>y.hostname===x.hostname)),"Unmatched stock/server entries are explicit, source-backed, and not simultaneously linked.");
 check(assertions,"association-coverage",links.length>0,`Canonical state currently exposes ${links.length} stock/server association pair(s), ${unmatchedStocks.length} unmatched stock(s), and ${unmatchedServers.length} unmatched organization server(s).`);
 const status=assertions.every(x=>x.pass)?"PASS":"FAIL",finishedAt=Date.now(),summary=`${assertions.filter(x=>x.pass).length}/${assertions.length} assertions passed.`;
 ns.write(RESULT_PATH,JSON.stringify({schemaVersion:1,testId,validationVersion,status,startedAt,finishedAt,assertions,summary},null,2),"w");
 const record=evidenceRecord({testId,validationVersion,status,kind:"automated",summary,assertions,at:finishedAt});appendEvidence(ns,record);recordValidationResult(ns,{testId,validationVersion,status,evidenceId:record.id,kind:record.kind,summary:record.summary,at:finishedAt});
}
function check(out,id,pass,evidence){out.push({id,pass:Boolean(pass),evidence});}
function read(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
