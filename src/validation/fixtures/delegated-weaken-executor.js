import { AUTHORITY_STATE_PATH, authorityClaim } from "../../core/authority.js";
import { WORK_ORDER_STATE_PATH, delegatedAuthorization } from "../../core/work-orders.js";

export async function main(ns){
    const [workOrderId,receiver,target,resultPath]=ns.args.map(String);
    const claim=authorityClaim("server",target,"hacking-control");
    const authority=read(ns,AUTHORITY_STATE_PATH),orders=read(ns,WORK_ORDER_STATE_PATH);
    const authorization=delegatedAuthorization(authority,orders,{workOrderId,receiver,claim,at:Date.now()});
    if(!authorization.authorized||authorization.mode!=="DELEGATED"){
        write(ns,resultPath,{schemaVersion:1,kind:"validation-hacking-result",status:"DENIED",workOrderId,receiver,target,authorization,at:Date.now()});
        return;
    }
    const before=ns.getServerSecurityLevel(target);
    const weakenResult=await ns.weaken(target,{additionalMsec:0});
    const after=ns.getServerSecurityLevel(target);
    write(ns,resultPath,{schemaVersion:1,kind:"validation-hacking-result",status:"COMPLETED",workOrderId,receiver,target,before,after,weakenResult,authorization:{mode:authorization.mode,workOrderId:authorization.workOrderId,authorityLeaseId:authorization.authorityLeaseId,correlationId:authorization.correlationId},at:Date.now()});
}
function read(ns,path){if(ns.getHostname()!=="home"||!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
function write(ns,path,value){ns.write(path,JSON.stringify(value,null,2),"w");}
