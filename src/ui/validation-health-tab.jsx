import { V, panel, sectionTitle, tone } from "./validation-theme.js";

export function ValidationHealthTab({ snapshot }) {
    const health=snapshot.health;
    if(!health) return <Empty>Waiting for health telemetry…</Empty>;
    const unhealthy=health.services?.filter((s)=>s.health!=="healthy") ?? [];
    const recent=(snapshot.incidents?.incidents ?? []).filter((x)=>x.severity!=="info").slice(-8).reverse();
    return <div style={{display:"grid",gap:12}}>
        <section style={{...panel,padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Dot color={tone(health.overall)}/><strong style={{color:tone(health.overall),fontSize:18}}>{health.overall.toUpperCase()}</strong>
            <span style={{color:V.muted}}>{health.serviceCount} services</span><span style={{marginLeft:"auto",color:V.muted,fontSize:12}}>updated {age(health.generatedAt)} ago</span>
        </section>
        {unhealthy.length ? <Section title="ACTIVE ISSUES">{unhealthy.map((s)=><ServiceRow key={s.instanceId} s={s}/>)}</Section> : <section style={{...panel,padding:14,color:V.green}}>All reporting services are healthy.</section>}
        <Section title="SERVICE PLACEMENT">{(health.services??[]).map((s)=><ServiceRow key={s.instanceId} s={s} placement/>)}</Section>
        {recent.length ? <Section title="RECENT INCIDENTS">{recent.map((x,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"150px 90px 1fr",gap:10,padding:"5px 0",fontSize:12}}><span>{x.service}</span><span style={{color:x.severity==="error"?V.red:V.amber}}>{x.severity.toUpperCase()}</span><span style={{color:V.muted}}>{x.message}</span></div>)}</Section>:null}
    </div>;
}
function Section({title,children}){return <section style={{...panel,padding:14}}><div style={sectionTitle}>{title}</div><div style={{marginTop:8}}>{children}</div></section>;}
function ServiceRow({s,placement}){return <div style={{display:"grid",gridTemplateColumns:placement?"180px 100px 80px 100px 1fr":"180px 100px 1fr",gap:10,padding:"5px 0",fontSize:12,borderBottom:`1px solid ${V.divider}`}}><span>{s.service}</span>{placement?<><span style={{color:V.muted}}>{s.host}</span><span style={{color:V.muted}}>pid {s.pid}</span><span style={{color:V.muted}}>{uptime(s.startedAt)}</span></>:null}<span style={{color:tone(s.health),fontWeight:700}}>{s.health.toUpperCase()}</span>{!placement?<span style={{color:V.muted}}>{s.reason??""}</span>:null}</div>;}
function Dot({color}){return <span style={{width:11,height:11,borderRadius:"50%",background:color,boxShadow:`0 0 12px ${color}`}}/>;}
function Empty({children}){return <div style={{...panel,padding:20,color:V.muted}}>{children}</div>;}
function age(at){if(!Number.isFinite(at))return "—";const s=Math.max(0,Math.floor((Date.now()-at)/1000));return s<60?`${s}s`:`${Math.floor(s/60)}m`;}
function uptime(at){if(!Number.isFinite(at))return "—";const s=Math.max(0,Math.floor((Date.now()-at)/1000));if(s<60)return `${s}s`;if(s<3600)return `${Math.floor(s/60)}m ${String(s%60).padStart(2,"0")}s`;if(s<86400)return `${Math.floor(s/3600)}h ${String(Math.floor((s%3600)/60)).padStart(2,"0")}m`;return `${Math.floor(s/86400)}d ${String(Math.floor((s%86400)/3600)).padStart(2,"0")}h`;}
