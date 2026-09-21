import { TESTS } from "../validation/test-registry.js";
import { V, panel, sectionTitle } from "./validation-theme.js";

export function ValidationTestsTab({snapshot,bridge}){
    const running=snapshot.testRun;
    const result=snapshot.testResult;
    const evidence=snapshot.evidence?.records??[];
    function send(intent,message){if(bridge.pendingIntent){bridge.feedback="Another dashboard command is already queued.";return;}bridge.pendingIntent=intent;bridge.feedback=message;}
    function run(test){if(!test.manual)send({type:"run-validation-test",testId:test.id},`Starting ${test.title}…`);}
    function confirm(test){send({type:"confirm-validation-test",testId:test.id},`Recording operator confirmation for ${test.title}…`);}
    return <div style={{display:"grid",gridTemplateColumns:"1.05fr 1fr",gap:12}}>
        <section style={{...panel,padding:14}}>
            <div style={sectionTitle}>REGISTERED TESTS</div>
            <div style={{marginTop:8,color:V.muted,fontSize:12}}>Repository-registered tests only. Automated and operator-confirmed evidence remain explicitly distinguished.</div>
            <div style={{display:"grid",gap:8,marginTop:12}}>
                {TESTS.map((test)=><TestCard key={test.id} test={test} running={running} latest={latestFor(evidence,test.id)} onRun={()=>run(test)} onConfirm={()=>confirm(test)}/>)}
            </div>
        </section>
        <section style={{...panel,padding:14}}>
            <div style={sectionTitle}>CURRENT / LATEST RESULT</div>
            <Result run={running} result={result}/>
            {bridge.feedback?<div style={{marginTop:12,color:V.muted,fontSize:12}}>{bridge.feedback}</div>:null}
            <div style={{...sectionTitle,marginTop:18}}>RECENT EVIDENCE</div>
            <Evidence records={evidence}/>
        </section>
    </div>;
}
function TestCard({test,running,latest,onRun,onConfirm}){
    const active=running?.testId===test.id;
    return <div style={{border:`1px solid ${V.divider}`,borderRadius:7,padding:11,background:V.raised}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}><strong>{test.title}</strong><Risk value={test.risk}/><span style={{marginLeft:"auto",color:latest?.status==="PASS"?V.green:latest?.status==="FAIL"?V.red:V.muted,fontSize:11,fontWeight:800}}>{active?"RUNNING":latest?.status??(test.manual?"OBSERVE":"READY")}</span></div>
        <div style={{marginTop:6,color:V.muted,fontSize:12,lineHeight:1.45}}>{test.description}</div>
        <div style={{display:"flex",alignItems:"center",marginTop:9}}><span style={{color:V.muted,fontSize:11}}>{test.id}</span>
            {test.manual?<button disabled={Boolean(running)} onClick={onConfirm} style={button(Boolean(running),false)}>Confirm Observed Pass</button>:<button disabled={Boolean(running)} onClick={onRun} style={button(Boolean(running),true)}>Run Test</button>}
        </div>
        {latest?<div style={{marginTop:7,color:V.muted,fontSize:10}}>Latest: {latest.kind} · {new Date(latest.at).toLocaleString()}</div>:null}
    </div>;
}
function Result({run,result}){
    if(run)return <div style={{marginTop:16,color:V.blue,fontWeight:800}}>● RUNNING — {run.testId}<div style={{marginTop:7,color:V.muted,fontSize:12,fontWeight:400}}>pid {run.pid}</div></div>;
    if(!result)return <div style={{marginTop:16,color:V.muted}}>No automated test result recorded yet.</div>;
    return <div style={{marginTop:14}}><div style={{fontSize:20,fontWeight:850,color:result.status==="PASS"?V.green:V.red}}>{result.status} — {result.testId}</div>
        <div style={{marginTop:5,color:V.muted,fontSize:11}}>{duration(result)} · {new Date(result.finishedAt).toLocaleTimeString()}</div>
        <div style={{display:"grid",gap:5,marginTop:12}}>{(result.assertions??[]).map((a)=><div key={a.id} style={{padding:"7px 8px",border:`1px solid ${V.divider}`,borderRadius:5,fontSize:12}}><span style={{color:a.pass?V.green:V.red,marginRight:8}}>{a.pass?"✓":"✕"}</span>{a.id}<span style={{float:"right",color:V.muted}}>{a.evidence}</span></div>)}</div>
    </div>;
}
function Evidence({records}){const recent=records.slice(-5).reverse();return <div style={{display:"grid",gap:5,marginTop:8}}>{recent.length?recent.map((r)=><div key={r.id} style={{padding:"7px 8px",border:`1px solid ${V.divider}`,borderRadius:5,fontSize:11}}><span style={{color:r.status==="PASS"?V.green:V.red,fontWeight:800}}>{r.status}</span>　{r.testId}<span style={{float:"right",color:V.muted}}>{r.kind}</span><div style={{marginTop:3,color:V.muted}}>{r.summary}</div></div>):<span style={{color:V.muted,fontSize:12}}>No durable evidence recorded yet.</span>}</div>;}
function latestFor(records,id){return [...records].reverse().find((r)=>r.testId===id)??null;}
function Risk({value}){return <span style={{padding:"2px 6px",borderRadius:4,border:`1px solid ${V.green}`,color:V.green,fontSize:9,fontWeight:900}}>{value}</span>;}
function button(disabled,primary){return{marginLeft:"auto",padding:"6px 11px",borderRadius:5,border:`1px solid ${primary?V.blue:V.border}`,background:disabled?V.page:primary?"#177ee3":V.raised,color:disabled?V.muted:V.text,fontWeight:750,cursor:disabled?"default":"pointer"};}
function duration(r){return Number.isFinite(r?.startedAt)&&Number.isFinite(r?.finishedAt)?`${Math.max(0,r.finishedAt-r.startedAt)}ms`:"—";}
