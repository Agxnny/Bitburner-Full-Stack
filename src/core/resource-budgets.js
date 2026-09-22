import { PORTS } from "./ports.js";

export const BUDGET_STATE_PATH="data/control/resource-budgets.json";
export const BUDGET_SCHEMA_VERSION=2;
export const BUDGET_DECISION_LIMIT=80;
export const RAM_BUDGET_MIN_GB=0.01;
export const RAM_BUDGET_MAX_GB=1048576;
export const MONEY_BUDGET_MIN=1;
export const MONEY_BUDGET_MAX=1e30;

export function setRamBudget({requestId,allocationId,owner,limitGb,correlationId=null,at=Date.now()}){
    return command("set-ram",{requestId,allocationId,owner,limitGb,correlationId,at});
}
export function releaseRamBudget({requestId,allocationId,owner,at=Date.now()}){
    return command("release-ram",{requestId,allocationId,owner,at});
}
export function setMoneyBudget({requestId,allocationId,owner,limit,correlationId=null,at=Date.now()}){
    return command("set-money",{requestId,allocationId,owner,limit,correlationId,at});
}
export function reserveMoney({requestId,reservationId,allocationId,owner,amount,correlationId=null,at=Date.now()}){
    return command("reserve-money",{requestId,reservationId,allocationId,owner,amount,correlationId,at});
}
export function releaseMoneyReservation({requestId,reservationId,owner,at=Date.now()}){
    return command("release-money",{requestId,reservationId,owner,at});
}
export function settleMoneyReservation({requestId,reservationId,owner,actualAmount=null,at=Date.now()}){
    return command("settle-money",{requestId,reservationId,owner,actualAmount,at});
}
export function releaseMoneyBudget({requestId,allocationId,owner,at=Date.now()}){
    return command("release-money-budget",{requestId,allocationId,owner,at});
}
export function publishBudgetCommand(ns,value){return ns.tryWritePort(PORTS.RESOURCE_BUDGETS,JSON.stringify(value))===true;}
export function validBudgetCommand(v){
    if(!v||v.schemaVersion!==2||v.kind!=="resource-budget-command"||!ACTIONS.has(v.action))return false;
    if(!str(v.requestId)||!str(v.owner)||!Number.isFinite(v.at))return false;
    if(["set-ram","release-ram","set-money","reserve-money","release-money-budget"].includes(v.action)&&!str(v.allocationId))return false;
    if(v.action==="set-ram")return finiteRange(v.limitGb,RAM_BUDGET_MIN_GB,RAM_BUDGET_MAX_GB)&&nullableString(v.correlationId);
    if(v.action==="set-money")return finiteRange(v.limit,MONEY_BUDGET_MIN,MONEY_BUDGET_MAX)&&nullableString(v.correlationId);
    if(v.action==="reserve-money")return str(v.reservationId)&&finiteRange(v.amount,MONEY_BUDGET_MIN,MONEY_BUDGET_MAX)&&nullableString(v.correlationId);
    if(["release-money","settle-money"].includes(v.action)&&!str(v.reservationId))return false;
    if(v.action==="settle-money"&&v.actualAmount!==null&&v.actualAmount!==undefined&&!finiteRange(v.actualAmount,0,MONEY_BUDGET_MAX))return false;
    return true;
}
export function validBudgetState(v){
    return Boolean(v&&[1,2].includes(v.schemaVersion)&&v.kind==="resource-budget-state"&&v.owner==="resource-budget-manager"&&Array.isArray(v.ramAllocations)&&Array.isArray(v.decisions)&&(v.schemaVersion===1||(Array.isArray(v.moneyAllocations)&&Array.isArray(v.moneyReservations))));
}
export function ramBudgetFor(state,owner){return validBudgetState(state)&&str(owner)?state.ramAllocations.find(x=>x.owner===owner)??null:null;}
export function moneyBudgetFor(state,owner){return validBudgetState(state)&&Array.isArray(state.moneyAllocations)&&str(owner)?state.moneyAllocations.find(x=>x.owner===owner)??null:null;}
export function moneyReservedFor(state,allocationId){return validBudgetState(state)&&Array.isArray(state.moneyReservations)?state.moneyReservations.filter(x=>x.allocationId===allocationId&&x.state==="RESERVED").reduce((n,x)=>n+x.amount,0):0;}
export function moneyAvailableFor(state,owner){const b=moneyBudgetFor(state,owner);return b?Math.max(0,b.limit-b.spent-moneyReservedFor(state,b.allocationId)):0;}
function command(action,fields){return {schemaVersion:2,kind:"resource-budget-command",action,...fields};}
function str(v){return typeof v==="string"&&v.length>0;} function nullableString(v){return v===null||v===undefined||typeof v==="string";} function finiteRange(v,min,max){return Number.isFinite(v)&&v>=min&&v<=max;}
const ACTIONS=new Set(["set-ram","release-ram","set-money","reserve-money","release-money","settle-money","release-money-budget"]);
