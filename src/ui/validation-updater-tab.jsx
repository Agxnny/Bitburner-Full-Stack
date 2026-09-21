import { V, panel, sectionTitle } from "./validation-theme.js";

export function ValidationUpdaterTab({ snapshot, bridge }) {
    const s=snapshot.update;
    if(!s) return <div style={{...panel,padding:20,color:V.muted}}>Waiting for Update Watcher telemetry…</div>;
    const fresh=Number.isFinite(s.heartbeatAt)&&Date.now()-s.heartbeatAt<15000;
    const available=s.phase==="update-available"&&Number.isSafeInteger(s.presentedRevision);
    const install=installation(s);
    function send(action){
        if(!available){bridge.feedback="No update is awaiting approval.";return;}
        if(bridge.pendingIntent){bridge.feedback="Command already queued.";return;}
        bridge.pendingIntent={action,revision:s.presentedRevision};
        bridge.feedback=`${action==="approve"?"Approving":"Deferring"} r${s.presentedRevision}…`;
    }
    return <div style={{display:"grid",gap:12}}>
        <section style={{...panel,padding:16}}>
            <div style={sectionTitle}>UPDATE WATCHER</div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginTop:12}}>
                <strong style={{fontSize:25}}>{release(s.local)}</strong>
                <span style={{color:fresh?V.green:V.red,fontWeight:800}}>● {fresh?"ONLINE":"STALE"}</span>
                {available?<span style={{padding:"7px 10px",border:`1px solid ${V.amber}`,borderRadius:6,color:V.amber}}>↑ r{s.presentedRevision} available</span>:null}
                {install?<span style={{color:install.color,fontWeight:700}}>{install.label}</span>:null}
                <span style={{marginLeft:"auto",color:V.muted}}>heartbeat {age(s.heartbeatAt)} · next check {countdown(s.nextCheckAt)}</span>
            </div>
            {available?<div style={{display:"flex",gap:8,marginTop:16}}><Button primary onClick={()=>send("approve")}>Install r{s.presentedRevision}</Button><Button onClick={()=>send("decline")}>Later</Button></div>:null}
            {bridge.feedback?<div style={{marginTop:10,color:V.muted,fontSize:12}}>{bridge.feedback}</div>:null}
            {s.error?<div style={{marginTop:10,color:V.red,fontSize:12}}>{s.error}</div>:null}
        </section>
        <section style={{...panel,padding:14}}><div style={sectionTitle}>DISCOVERY</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
            <Metric label="Selected source" value={s.discovery?.selectedSource??"—"}/><Metric label="Raw revision" value={rev(s.discovery?.raw?.revision)}/><Metric label="API revision" value={rev(s.discovery?.api?.revision)}/>
        </div></section>
    </div>;
}
function Button({children,onClick,primary}){return <button onClick={onClick} style={{padding:"9px 15px",borderRadius:6,border:`1px solid ${primary?"#4aa8ff":V.border}`,background:primary?"#177ee3":V.raised,color:V.text,fontWeight:750,cursor:"pointer"}}>{children}</button>;}
function Metric({label,value}){return <div style={{padding:10,border:`1px solid ${V.divider}`,borderRadius:6}}><div style={{color:V.muted,fontSize:11}}>{label}</div><div style={{marginTop:5}}>{value}</div></div>;}
function release(v){return v?.version&&Number.isSafeInteger(v.revision)?`${v.version}-r${v.revision}`:"—";} function rev(v){return Number.isSafeInteger(v)?`r${v}`:"—";}
function age(at){if(!Number.isFinite(at))return "—";return `${Math.max(0,Math.floor((Date.now()-at)/1000))}s ago`;} function countdown(at){return Number.isFinite(at)?`${Math.max(0,Math.ceil((at-Date.now())/1000))}s`:"—";}
function installation(s){const r=s.deployment?.report;if(s.deployment?.running)return{label:"↻ Installing",color:V.blue};if(r?.status==="committed"&&r?.success===true&&r?.clean===true)return{label:"✓ Install clean",color:V.green};if(r&&(r.success===false||r.clean===false||r.status==="failed"||r.status==="committed-runtime-degraded"))return{label:"! Install problem",color:V.red};return null;}
