import { applyDashboardPosition, applyDashboardSize, restoreDashboardPosition, useDashboardWindow } from "./dashboard-window-memory.js";
import { V } from "./validation-theme.js";
import { validationSummary } from "./validation-catalog.js";
import { ValidationOverviewTab } from "./validation-overview-tab.jsx";
import { ValidationWorkTab } from "./validation-work-tab.jsx";
import { ValidationHealthTab } from "./validation-health-tab.jsx";
import { ValidationUpdaterTab } from "./validation-updater-tab.jsx";
import { ValidationDataTab } from "./validation-data-tab.jsx";

const SCRIPT_PATH="src/ui/validation-dashboard.jsx";
const WINDOW_KEY="validation-dashboard";
const REFRESH_MS=1000;
const COMMAND_PATH="data/update-command.json";
const PATHS={
    health:"data/telemetry/health.json", incidents:"data/telemetry/incidents.json", update:"data/update-status.json",
    player:"data/observations/player.json", network:"data/observations/network.json", market:"data/observations/market.json",
    infrastructure:"data/observations/infrastructure.json", capabilities:"data/observations/capabilities.json",
};
const TABS=[["overview","Overview"],["validating","Validating"],["validated","Validated"],["health","Health"],["updater","Updater"],["data","Data"]];

/** @param {NS} ns */
export async function main(ns){
    if(ns.getHostname()!=="home"){ns.tprint("ERROR | validation-dashboard must run on home");return;}
    const copies=ns.ps("home").filter((p)=>p.filename===SCRIPT_PATH).sort((a,b)=>a.pid-b.pid);
    if(copies.length&&copies[0].pid!==ns.pid)return;
    ns.disableLog("sleep");
    const bridge={snapshot:readSnapshot(ns),pendingIntent:null,feedback:"",desiredSize:null,appliedSize:null,desiredPosition:null,appliedPosition:null,layout:null,preferredWidth:1180};
    ns.ui.openTail(); ns.ui.setTailTitle("Full Stack — Validation Dashboard"); ns.clearLog();
    ns.printRaw(<ValidationDashboard bridge={bridge}/>);
    await ns.sleep(75); await restoreDashboardPosition(ns,WINDOW_KEY);
    while(true){
        if(bridge.pendingIntent){bridge.feedback=handleIntent(ns,bridge.pendingIntent);bridge.pendingIntent=null;}
        bridge.snapshot=readSnapshot(ns); applyDashboardSize(ns,bridge); applyDashboardPosition(ns,bridge);
        await ns.sleep(REFRESH_MS);
    }
}
function handleIntent(ns,intent){
    if(intent.type!=="update-command")return "Unsupported dashboard intent.";
    if(ns.fileExists(COMMAND_PATH,"home"))return "Update command already queued.";
    const command={schemaVersion:1,id:`validation-ui-${Date.now()}-${Math.floor(Math.random()*1e6)}`,action:intent.action,revision:intent.revision,createdAt:Date.now(),origin:"validation-dashboard"};
    ns.write(COMMAND_PATH,JSON.stringify(command,null,2),"w");
    return `${intent.action==="approve"?"Installing":"Deferred"} r${intent.revision}.`;
}
function readSnapshot(ns){
    const observations={}; for(const d of ["player","network","market","infrastructure","capabilities"])observations[d]=readJson(ns,PATHS[d]);
    return {capturedAt:Date.now(),health:readJson(ns,PATHS.health),incidents:readJson(ns,PATHS.incidents),update:readJson(ns,PATHS.update),observations};
}
function ValidationDashboard({bridge}){
    const rootRef=useDashboardWindow(WINDOW_KEY,bridge,{minWidth:980,minHeight:680,maxWidth:1320,maxHeight:860});
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
        if(!emergencySignature||ack===emergencySignature)return;
        const seen=readLocal("emergency-focus");
        if(seen!==emergencySignature){setTab("health");writeLocal("emergency-focus",emergencySignature);}
    },[emergencySignature,ack]);

    const updateRevision=snapshot?.update?.phase==="update-available"?snapshot.update.presentedRevision:null;
    const [seenUpdate,setSeenUpdate]=React.useState(()=>Number(readLocal("seen-update")||-1));
    function navigate(next){setTab(next);if(next==="updater"&&Number.isSafeInteger(updateRevision)){setSeenUpdate(updateRevision);writeLocal("seen-update",String(updateRevision));}}
    const updateUnread=Number.isSafeInteger(updateRevision)&&updateRevision!==seenUpdate?1:0;
    const summary=validationSummary();
    const badges={validating:summary.validatingGroups,health:unhealthy.length,updater:updateUnread};

    return <div ref={rootRef} style={{boxSizing:"border-box",minWidth:960,minHeight:660,padding:10,background:V.page,color:V.text,fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'}}>
        <div style={{border:`1px solid ${V.border}`,borderRadius:10,overflow:"hidden",background:V.surface,boxShadow:"0 10px 30px rgba(0,0,0,.28)"}}>
            <Header snapshot={snapshot}/>
            {emergencySignature&&ack!==emergencySignature?<Emergency count={unhealthy.length} onAck={()=>{setAck(emergencySignature);writeLocal("emergency-ack",emergencySignature);}}/>:null}
            <nav style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,padding:"8px 10px",borderBottom:`1px solid ${V.divider}`}}>
                {TABS.map(([id,label])=><Tab key={id} active={tab===id} badge={badges[id]??0} danger={id==="health"&&emergency} onClick={()=>navigate(id)}>{label}</Tab>)}
            </nav>
            <main style={{padding:12,minHeight:540}}>
                {tab==="overview"?<ValidationOverviewTab snapshot={snapshot} navigate={navigate}/>:null}
                {tab==="validating"?<ValidationWorkTab mode="validating"/>:null}
                {tab==="validated"?<ValidationWorkTab mode="validated"/>:null}
                {tab==="health"?<ValidationHealthTab snapshot={snapshot} tick={tick}/>:null}
                {tab==="updater"?<ValidationUpdaterTab snapshot={snapshot} bridge={bridge} tick={tick}/>:null}
                {tab==="data"?<ValidationDataTab snapshot={snapshot} tick={tick}/>:null}
            </main>
        </div>
    </div>;
}
function Header({snapshot}){const local=snapshot?.update?.local;const version=local?.version&&Number.isSafeInteger(local.revision)?`${local.version}-r${local.revision}`:"—";const online=snapshot?.health?.overall==="healthy";return <header style={{display:"flex",alignItems:"center",height:46,padding:"0 14px",borderBottom:`1px solid ${V.divider}`,background:V.raised}}><strong style={{letterSpacing:".08em",color:"#b8d2f3"}}>FULL STACK — VALIDATION DASHBOARD</strong><span style={{marginLeft:"auto",color:V.muted,fontSize:12}}>{version}　|　M2 — Telemetry Foundation　</span><span style={{color:online?V.green:V.amber,fontSize:12,fontWeight:800}}>● {online?"Online":"Attention"}</span></header>;}
function Emergency({count,onAck}){return <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:"rgba(255,93,104,.12)",borderBottom:`1px solid ${V.red}`,color:V.red,fontWeight:800}}>● EMERGENCY — {count} persistent services unavailable or unhealthy <button onClick={onAck} style={{marginLeft:"auto",border:`1px solid ${V.red}`,borderRadius:5,background:"transparent",color:V.text,padding:"5px 9px",cursor:"pointer"}}>Acknowledge</button></div>;}
function Tab({children,active,badge,danger,onClick}){const color=danger?V.red:active?V.green:V.blue;return <button onClick={onClick} style={{height:38,border:`1px solid ${active?color:V.border}`,borderRadius:6,background:active?"#10251f":V.page,color:active?color:"#b8d2f3",fontWeight:750,cursor:"pointer",boxShadow:active?`inset 0 0 14px ${color}22`:"none"}}>{children}{badge>0?<span style={{display:"inline-grid",placeItems:"center",minWidth:18,height:18,marginLeft:8,padding:"0 4px",borderRadius:9,background:danger?V.red:V.blue,color:"white",fontSize:10}}>{badge}</span>:null}</button>;}
function readJson(ns,path){if(!ns.fileExists(path,"home"))return null;try{return JSON.parse(ns.read(path));}catch{return null;}}
function readLocal(key){try{return localStorage.getItem(`bitburner-full-stack.validation.${key}`);}catch{return null;}}
function writeLocal(key,value){try{localStorage.setItem(`bitburner-full-stack.validation.${key}`,value);}catch{}}
