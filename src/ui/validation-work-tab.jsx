import { V, panel, tone } from "./validation-theme.js";
import { reconcileValidation } from "../validation/validation-state.js";

export function ValidationWorkTab({ mode, snapshot }) {
    const state=reconcileValidation(snapshot.validationPlan,snapshot.validationLedger);
    const groups=mode==="validated"?state.validated:state.validating;
    return <div style={{display:"grid",gap:10}}>
        <div style={{color:V.muted,fontSize:12}}>{mode==="validated" ? "Requirements with current version-matched PASS truth in the local ledger. A changed validation version returns work to Validating." : "Current repository requirements not yet satisfied by version-matched local PASS truth."}</div>
        {groups.length?groups.map((g)=><Group key={g.id} group={g} mode={mode}/>):<section style={{...panel,padding:14,color:V.muted}}>No {mode} validation groups.</section>}
    </div>;
}
function Group({group,mode}){
    const validating=mode!=="validated";
    return <section style={{...panel,padding:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><strong>{group.milestone} — {group.title}</strong>
            <span style={{marginLeft:"auto",color:tone(validating?"validating":"validated"),fontSize:11,fontWeight:800}}>{validating?"VALIDATING":"VALIDATED"}</span>
            {Number.isSafeInteger(group.revision)?<span style={{color:V.muted,fontSize:11}}>r{group.revision}</span>:null}
        </div>
        <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:6}}>
            {group.requirements.map((r)=><div key={r.id} style={{padding:"7px 9px",border:`1px solid ${V.divider}`,borderRadius:5,color:V.muted,fontSize:12}}>
                <span style={{color:r.validated?V.green:V.blue,marginRight:7}}>{r.validated?"✓":"○"}</span>{r.title}
                <span style={{float:"right",fontSize:10}}>v{r.validationVersion}</span>
            </div>)}
        </div>
    </section>;
}
