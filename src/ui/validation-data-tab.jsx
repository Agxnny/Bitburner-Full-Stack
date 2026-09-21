import { V, panel, sectionTitle, tone } from "./validation-theme.js";
const DOMAINS=["player","network","market","infrastructure","capabilities"];

export function ValidationDataTab({ snapshot }) {
    return <div style={{display:"grid",gap:12}}>
        <div style={{color:V.muted,fontSize:12}}>M2 observations are factual producer inputs. M3 canonical state is the durable single-writer consumer contract. Age is factual; each consumer decides whether it is fresh enough.</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10}}>
            {DOMAINS.map((d)=><Domain key={d} name={d} observation={snapshot.observations?.[d]} canonical={snapshot.canonical?.[d]}/>)}
        </div>
        <section style={{...panel,padding:14}}><div style={sectionTitle}>CANONICAL STATE CONTRACT</div>
            <div style={{marginTop:10,color:V.muted,fontSize:12}}>Each domain shows the latest observation age and the canonical revision accepted by M3. Missing time is not interpolated, and canonical state does not label data globally fresh or stale.</div>
        </section>
    </div>;
}
function Domain({name,observation,canonical}){
    const availability=canonical?.availability ?? observation?.availability ?? "missing";
    const observedAt=canonical?.observedAt ?? observation?.observedAt;
    const revision=Number.isSafeInteger(canonical?.revision)?`r${canonical.revision}`:"no canonical";
    const keys=canonical?.data&&typeof canonical.data==="object"?Object.keys(canonical.data).length:0;
    return <section style={{...panel,padding:12,minHeight:132}}><div style={{textTransform:"capitalize",fontWeight:750}}>{name}</div><div style={{marginTop:12,color:tone(availability),fontWeight:800}}>{availability.toUpperCase()}</div><div style={{marginTop:7,color:V.muted,fontSize:11}}>{age(observedAt)} · {revision}</div><div style={{marginTop:5,color:V.muted,fontSize:11}}>{keys} canonical top-level fields</div></section>;
}
function age(at){if(!Number.isFinite(at))return "no observation";const ms=Math.max(0,Date.now()-at);return ms<1000?`${ms}ms ago`:ms<60000?`${Math.floor(ms/1000)}s ago`:`${Math.floor(ms/60000)}m ago`;}
