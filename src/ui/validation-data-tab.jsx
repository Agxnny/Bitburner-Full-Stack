import { V, panel, sectionTitle, tone } from "./validation-theme.js";
const DOMAINS=["player","network","market","infrastructure","capabilities"];

export function ValidationDataTab({ snapshot }) {
    return <div style={{display:"grid",gap:12}}>
        <div style={{color:V.muted,fontSize:12}}>Observation snapshots are M2 inputs, not canonical game state. M3 will own canonical reconciliation.</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10}}>
            {DOMAINS.map((d)=><Domain key={d} name={d} value={snapshot.observations?.[d]}/>)}
        </div>
        <section style={{...panel,padding:14}}><div style={sectionTitle}>COLLECTOR DETAIL</div>
            <div style={{marginTop:10,color:V.muted,fontSize:12}}>Select-domain drill-down and schema/invariant evidence will expand here as M3 canonical state is introduced. This foundation deliberately avoids treating raw observation data as canonical truth.</div>
        </section>
    </div>;
}
function Domain({name,value}){const stale=!Number.isFinite(value?.freshUntil)||Date.now()>value.freshUntil;const status=!value?"missing":stale?"stale":value.status??"unknown";const keys=value?.data&&typeof value.data==="object"?Object.keys(value.data).length:0;return <section style={{...panel,padding:12,minHeight:118}}><div style={{textTransform:"capitalize",fontWeight:750}}>{name}</div><div style={{marginTop:12,color:tone(status==="ok"||status==="healthy"?"healthy":status),fontWeight:800}}>{status.toUpperCase()}</div><div style={{marginTop:7,color:V.muted,fontSize:11}}>{age(value?.collectedAt)} · {keys} top-level fields</div></section>;}
function age(at){if(!Number.isFinite(at))return "no snapshot";const s=Math.max(0,Math.floor((Date.now()-at)/1000));return s<60?`${s}s ago`:`${Math.floor(s/60)}m ago`;}
