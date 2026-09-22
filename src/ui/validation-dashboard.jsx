import { applyDashboardPosition, applyDashboardSize, restoreDashboardPosition, useDashboardWindow } from "./dashboard-window-memory.js";
import { V } from "./validation-theme.js";
import { readValidationLedger, readValidationPlan, recordValidationResult, requiredValidationVersion, validationSummaryFrom } from "../validation/validation-state.js";
import { ValidationOverviewTab } from "./validation-overview-tab.jsx";
import { ValidationWorkTab } from "./validation-work-tab.jsx";
import { ValidationHealthTab } from "./validation-health-tab.jsx";
import { ValidationDiagnosticsTab } from "./validation-diagnostics-tab.jsx";
import { ValidationUpdaterTab } from "./validation-updater-tab.jsx";
import { ValidationDataTab } from "./validation-data-tab.jsx";
import { ValidationTestsTab } from "./validation-tests-tab.jsx";
import { findTest } from "../validation/test-registry.js";
import { appendEvidence, evidenceRecord, readEvidence } from "../validation/evidence-store.js";

const SCRIPT_PATH="src/ui/validation-dashboard.jsx";
const WINDOW_KEY="validation-dashboard";
const REFRESH_MS=1000;
const COMMAND_PATH="data/update-command.json";
const TEST_RESULT_PATH="data/validation/latest-result.json";
const TEST_UI_PATH="data/validation/ui-state.json";
const PATHS={
    health:"data/telemetry/health.json", incidents:"data/telemetry/incidents.json", diagnostics:"data/diagnostics/incidents.json", update:"data/update-status.json",
    player:"data/observations/player.json", network:"data/observations/network.json", market:"data/observations/market.json",
    infrastructure:"data/observations/infrastructure.json", capabilities:"data/observations/capabilities.json",
    statePlayer:"data/state/player.json", stateNetwork:"data/state/network.json", stateMarket:"data/state/market.json",
    stateInfrastructure:"data/state/infrastructure.json", stateCapabilities:"data/state/capabilities.json",
};
const TABS=[["overview","⌂","Overview"],["validating","⚗","Validating"],["tests","☷","Tests"],["validated","✓","Validated"],["health","♡","Health"],["diagnostics","!","Diagnostics"],["updater","⇩","Updater"],["data","▤","Data"]];

/** @param {NS} ns */
export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | validation-dashboard must run on home");return;}
    const copies=ns.ps("home").filter((p)=>p.filename===SCRIPT_PATH).sort((a,b)=>a.pid-b.pid);
    if(copies.length&&copies[0].pid!==ns.pid)return;
    ns.disableLog("sleep"); ns.disableLog("run");
    const bridge={snapshot:readSnapshot(ns),pendingIntent:null,feedback:"",emergencyUi:{signature:null,focusedAt:null,acknowledgedAt:null,focusCount:0},desiredSize:null,appliedSize:null,desiredPosition:null,appliedPosition:null,layout:null,preferredWidth:720};
    ns.ui.openTail(); ns.ui.setTailTitle("Full Stack — Validation Dashboard"); ns.clearLog();
    ns.printRaw(<ValidationDashboard bridge={bridge}/>);
    await ns.sleep(75); await restoreDashboardPosition(ns,WINDOW_KEY);
    while(true){
        if(bridge.pendingIntent){bridge.feedback=handleIntent(ns,bridge.pendingIntent);bridge.pendingIntent=null;}
        bridge.snapshot=readSnapshot(ns); writeUiState(ns,bridge); applyDashboardSize(ns,bridge); applyDashboardPosition(ns,bridge);
        await ns.sleep(REFRESH_MS);
    }
}
function handleIntent(ns,intent){
    if(intent.type==="run-validation-test")return runValidationTest(ns,intent.testId);
    if(intent.type==="confirm-validation-test")return confirmValidationTest(ns,intent.testId);
    if(intent.type!=="update-command")return "Unsupported dashboard intent.";
    if(ns.fileExists(COMMAND_PATH,"home"))return "Update command already queued.";
    const command={schemaVersion:1,id:`validation-ui-${Date.now()}-${Math.floor(Math.random()*1e6)}`,action:intent.action,revision:intent.revision,createdAt:Date.now(),origin:"validation-dashboard"};
    ns.write(COMMAND_PATH,JSON.stringify(command,null,2),"w");
    return `${intent.action==="approve"?"Installing":"Deferred"} r${intent.revision}.`;
}
function runValidationTest(ns,testId){
    const test=findTest(testId);
    if(!test||!test.runner||test.manual)return "Test is not executable.";
    const anyActive=findRunningTest(ns); if(anyActive)return `Validation test already running (pid ${anyActive.pid}).`;
    const active=ns.ps("home").find((p)=>p.filename===test.runner);
    if(active)return `Test already running (pid ${active.pid}).`;
    const pid=ns.run(test.runner,{threads:1,preventDuplicates:true},test.id);
    return pid>0?`Started ${test.title} (pid ${pid}).`:`Could not start ${test.title}.`;
}
function confirmValidationTest(ns,testId){
    const test=findTest(testId);
    if(!test?.manual)return "Test is not operator-confirmable.";
    const plan=readValidationPlan(ns); const validationVersion=requiredValidationVersion(plan,testId)??1;
    const record=evidenceRecord({testId,validationVersion,status:"PASS",kind:"operator-confirmed",summary:"Operator confirmed the documented observation was completed successfully."}); appendEvidence(ns,record);
    recordValidationResult(ns,{testId,validationVersion,status:"PASS",evidenceId:record.id,kind:record.kind,summary:record.summary,at:record.at});
    return `Recorded operator-confirmed PASS for ${test.title}.`;
}
function readSnapshot(ns){
    const test=findRunningTest(ns);
    const observations={}; for(const d of ["player","network","market","infrastructure","capabilities"])observations[d]=readJson(ns,PATHS[d]);
    const canonical={}; for(const d of ["player","network","market","infrastructure","capabilities"])canonical[d]=readJson(ns,PATHS[`state${d[0].toUpperCase()}${d.slice(1)}`]);
    return {capturedAt:Date.now(),health:readJson(ns,PATHS.health),incidents:readJson(ns,PATHS.incidents),diagnostics:readJson(ns,PATHS.diagnostics),update:readJson(ns,PATHS.update),observations,canonical,validationPlan:readValidationPlan(ns),validationLedger:readValidationLedger(ns),testRun:test,testResult:readJson(ns,TEST_RESULT_PATH),evidence:readEvidence(ns)};
}
function findRunningTest(ns){
    for(const test of TESTS_RUNNABLE()){
        const testId=test.id;
        const process=ns.ps("home").find((p)=>p.filename===test.runner);
        if(process)return {testId,pid:process.pid,startedAt:Date.now()};
    }
    return null;
}
function TESTS_RUNNABLE(){return ["m3.authority.direct","m3.diagnostics.failure-correlation","m3.diagnostics.intelligence","m3.resource.associations","m3.cadence.control","m3.cadence.restart","m3.canonical.state","m3.canonical.restart","m2.dashboard.smoke","m2.dashboard.emergency-focus"].map(findTest).filter((x)=>x?.runner);}
function writeUiState(ns,bridge){ns.write(TEST_UI_PATH,JSON.stringify({schemaVersion:1,updatedAt:Date.now(),emergency:bridge.emergencyUi},null,2),"w");}
function ValidationDashboard({bridge}){
    const rootRef=useDashboardWindow(WINDOW_KEY,bridge,{minWidth:700,minHeight:680,maxWidth:1320,maxHeight:950});
    const [snapshot,setSnapshot]=React.useState(bridge.snapshot);
    const [tab,setTab]=React.useState("overview");
    const [tick,setTick]=React.useState(0);
    React.useEffect(()=>{const t=setInterval(()=>{setSnapshot(bridge.snapshot);setTick((x)=>x+1);},REFRESH_MS);return()=>clearInterval(t);},[bridge]);

    const health=snapshot?.health;
    const unhealthy=health?.services?.filter((s)=>s.health!=="healthy") ?? [];
    const serviceCount=health?.serviceCount ?? 0;
    const emergency=health?.overall==="failed" || (serviceCount>=4 && unhealthy.length>=Math.ceil(serviceCount/2));
    const emergencySignature=emergency ? unhealthy.map((s)=>`${s.service}:${s.health}`).sort().join("|") : null;
    const [ack,setAck]=React.useState(()=>readLocal("emergency-ack"));
    React.useEffect(()=>{
        if(!emergencySignature){
            if(ack){setAck(null);removeLocal("emergency-ack");}
            removeLocal("emergency-focus"); bridge.emergencyUi={signature:null,focusedAt:null,acknowledgedAt:null,focusCount:bridge.emergencyUi?.focusCount??0}; return;
        }
        bridge.emergencyUi={...bridge.emergencyUi,signature:emergencySignature};
        if(ack===emergencySignature)return;
        const seen=readLocal("emergency-focus");
        if(seen!==emergencySignature){
            setTab("health"); writeLocal("emergency-focus",emergencySignature);
            bridge.emergencyUi={...bridge.emergencyUi,signature:emergencySignature,focusedAt:Date.now(),focusCount:(bridge.emergencyUi?.focusCount??0)+1};
        }
    },[emergencySignature,ack,bridge]);

    const updateRevision=snapshot?.update?.phase==="update-available"?snapshot.update.presentedRevision:null;
    const [seenUpdate,setSeenUpdate]=React.useState(()=>Number(readLocal("seen-update")||-1));
    function navigate(next){setTab(next);if(next==="updater"&&Number.isSafeInteger(updateRevision)){setSeenUpdate(updateRevision);writeLocal("seen-update",String(updateRevision));}}
    const updateUnread=Number.isSafeInteger(updateRevision)&&updateRevision!==seenUpdate?1:0;
    const summary=validationSummaryFrom(snapshot.validationPlan,snapshot.validationLedger);
    const diagnosticCount=snapshot?.diagnostics?.activeCount??0;
    const badges={validating:summary.validatingGroups,health:unhealthy.length,diagnostics:diagnosticCount,updater:updateUnread};

    return <div ref={rootRef} style={{boxSizing:"border-box",minWidth:680,minHeight:660,padding:10,background:V.page,color:V.text,fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'}}>
        <div style={{border:`1px solid ${V.border}`,borderRadius:10,overflow:"hidden",background:V.surface,boxShadow:"0 10px 30px rgba(0,0,0,.28)"}}>
            <Header snapshot={snapshot}/>
            {emergencySignature&&ack!==emergencySignature?<Emergency count={unhealthy.length} onAck={()=>{setAck(emergencySignature);writeLocal("emergency-ack",emergencySignature);bridge.emergencyUi={...bridge.emergencyUi,signature:emergencySignature,acknowledgedAt:Date.now()};}}/>:null}
            <nav style={{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px",borderBottom:`1px solid ${V.divider}`}}>
                {TABS.map(([id,icon,label])=><Tab key={id} icon={icon} active={tab===id} badge={badges[id]??0} danger={id==="health"&&emergency} onClick={()=>navigate(id)}>{label}</Tab>)}
            </nav>
            <main style={{padding:12,minHeight:540}}>
                {tab==="overview"?<ValidationOverviewTab snapshot={snapshot} navigate={navigate}/>:null}
                {tab==="validating"?<ValidationWorkTab mode="validating" snapshot={snapshot}/>:null}
                {tab==="tests"?<ValidationTestsTab snapshot={snapshot} bridge={bridge} tick={tick}/>:null}
                {tab==="validated"?<ValidationWorkTab mode="validated" snapshot={snapshot}/>:null}
                {tab==="health"?<ValidationHealthTab snapshot={snapshot} tick={tick}/>:null}
                {tab==="diagnostics"?<ValidationDiagnosticsTab snapshot={snapshot} tick={tick}/>:null}
                {tab==="updater"?<ValidationUpdaterTab snapshot={snapshot} bridge={bridge} tick={tick}/>:null}
                {tab==="data"?<ValidationDataTab snapshot={snapshot} tick={tick}/>:null}
            </main>
        </div>
    </div>;
}
function Header({snapshot}){const local=snapshot?.update?.local;const version=local?.version&&Number.isSafeInteger(local.revision)?`${local.version}-r${local.revision}`:"—";const online=snapshot?.health?.overall==="healthy";return <header style={{display:"flex",alignItems:"center",height:46,padding:"0 14px",borderBottom:`1px solid ${V.divider}`,background:V.raised}}><strong style={{letterSpacing:".08em",color:"#b8d2f3"}}>FULL STACK — VALIDATION DASHBOARD</strong><span style={{marginLeft:"auto",color:V.muted,fontSize:12}}>{version}　|　M3 — Canonical State　</span><span style={{color:online?V.green:V.amber,fontSize:12,fontWeight:800}}>● {online?"Online":"Attention"}</span></header>;}
function Emergency({count,onAck}){return <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"rgba(255,93,104,.12)",borderBottom:`1px solid ${V.red}`,color:V.red,fontWeight:800}}>● EMERGENCY — {count} persistent services unavailable or unhealthy <button onClick={onAck} style={{marginLeft:"auto",border:`1px solid ${V.red}`,borderRadius:5,background:"transparent",color:V.text,padding:"5px 9px",cursor:"pointer"}}>Acknowledge</button></div>;}
function Tab({children,icon,active,badge,danger,onClick}){const color=danger?V.red:active?V.green:V.blue;return <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,height:36,flex:"1 1 150px",minWidth:132,padding:"0 12px",border:`1px solid ${active?color:V.border}`,borderRadius:6,background:active?"#10251f":V.page,color:active?color:"#b8d2f3",fontWeight:750,cursor:"pointer",boxShadow:active?`inset 0 0 14px ${color}22`:"none",whiteSpace:"nowrap"}}><span aria-hidden="true" style={{fontSize:16,lineHeight:1,minWidth:16,textAlign:"center"}}>{icon}</span><span>{children}</span>{badge>0?<span style={{display:"inline-grid",placeItems:"center",minWidth:18,height:18,marginLeft:1,padding:"0 4px",borderRadius:9,background:danger?V.red:V.blue,color:"white",fontSize:10}}>{badge}</span>:null}</button>;}
function readJson(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
function readLocal(key){try{return localStorage.getItem(`bitburner-full-stack.validation.${key}`);}catch{return null;}}
function writeLocal(key,value){try{localStorage.setItem(`bitburner-full-stack.validation.${key}`,value);}catch{}}
function removeLocal(key){try{localStorage.removeItem(`bitburner-full-stack.validation.${key}`);}catch{}}
