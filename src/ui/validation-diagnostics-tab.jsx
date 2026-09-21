import { V, panel, sectionTitle } from "./validation-theme.js";

export function ValidationDiagnosticsTab({ snapshot }){
    const state=snapshot.diagnostics;
    if(!state)return <div style={{...panel,padding:20,color:V.muted}}>Waiting for diagnostics state…</div>;
    const active=(state.incidents??[]).filter(x=>x.status==="active");
    const resolved=(state.incidents??[]).filter(x=>x.status!=="active").slice(0,8);
    return <div style={{display:"grid",gap:12}}>
        <section style={{...panel,padding:14}}>
            <div style={sectionTitle}>DIAGNOSTIC SUMMARY</div>
            <div style={{marginTop:8,color:active.length?V.amber:V.green,fontWeight:800}}>{active.length?(active.length+" active incident"+(active.length===1?"":"s")):"No active diagnostic incidents"}</div>
            <div style={{marginTop:5,color:V.muted,fontSize:12}}>Findings distinguish observed facts, correlated evidence, and bounded inference. Unknown causes remain unknown.</div>
        </section>
        {active.map(x=><Incident key={x.id} x={x}/>)}
        {resolved.length?<section style={{...panel,padding:14}}><div style={sectionTitle}>RECENTLY RESOLVED</div>{resolved.map(x=><div key={x.id} style={{padding:"7px 0",borderBottom:"1px solid "+V.divider,fontSize:12}}><strong>{x.source}</strong>　{x.message}<span style={{float:"right",color:V.muted}}>{x.occurrences} occurrence{x.occurrences===1?"":"s"}</span></div>)}</section>:null}
    </div>;
}
function Incident({x}){
    return <section style={{...panel,padding:14,borderColor:x.severity==="error"?V.red:V.amber}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <strong style={{color:x.severity==="error"?V.red:V.amber}}>{x.code}</strong>
            <Tag>{x.classification}</Tag><Tag>{String(x.confidence).toUpperCase()} CONFIDENCE</Tag>
            <span style={{marginLeft:"auto",color:V.muted,fontSize:11}}>seen {age(x.lastSeenAt)} ago · ×{x.occurrences}</span>
        </div>
        <div style={{marginTop:8,fontSize:13}}>{x.message}</div>
        <div style={{marginTop:10,color:V.muted,fontSize:11,fontWeight:800}}>EVIDENCE</div>
        {(x.evidence??[]).length?(x.evidence??[]).map((e,i)=><pre key={i} style={{whiteSpace:"pre-wrap",margin:"5px 0",padding:7,border:"1px solid "+V.divider,borderRadius:5,background:V.page,color:V.muted,fontSize:11}}>{explain(e)}</pre>):<div style={{color:V.muted,fontSize:12}}>No supporting evidence supplied.</div>}
    </section>;
}
function Tag({children}){return <span style={{padding:"2px 6px",border:"1px solid "+V.border,borderRadius:9,color:V.muted,fontSize:9,fontWeight:800}}>{children}</span>;}
function explain(e){
    if(e?.type==="runtime-unit")return "Runtime unit "+e.id+" ("+e.script+") failed: "+(e.error??"unknown error");
    if(e?.type==="deployment")return "Deployment r"+e.revision+": "+e.status+(e.error?" — "+e.error:"");
    if(e?.type==="changed-files")return "Changed files: "+(e.files??[]).join(", ");
    if(e?.type==="service-health")return e.service+" on "+e.host+" pid "+e.pid+": "+e.health+(e.reason?" — "+e.reason:"");
    if(e?.summary)return String(e.summary);
    try{return JSON.stringify(e);}catch{return String(e);}
}
function age(at){if(!Number.isFinite(at))return "—";const s=Math.max(0,Math.floor((Date.now()-at)/1000));return s<60?s+"s":Math.floor(s/60)+"m";}
