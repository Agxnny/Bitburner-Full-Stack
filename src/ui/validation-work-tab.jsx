import { V, panel, tone } from "./validation-theme.js";
import { VALIDATION_GROUPS } from "./validation-catalog.js";

export function ValidationWorkTab({ mode }) {
    const wanted=mode==="validated"?"validated":"validating";
    const groups=VALIDATION_GROUPS.filter((g)=>g.lifecycle===wanted);
    return <div style={{display:"grid",gap:10}}>
        <div style={{color:V.muted,fontSize:12}}>{wanted==="validated" ? "Completed evidence is collapsed away from the active workspace. Regressed groups return to Validating." : "Active validation work only. Passed systems leave this workspace once their required evidence is complete."}</div>
        {groups.map((g)=><section key={g.id} style={{...panel,padding:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
                <strong>{g.milestone} — {g.title}</strong>
                <span style={{marginLeft:"auto",color:tone(g.lifecycle),fontSize:11,fontWeight:800}}>{g.lifecycle.toUpperCase()}</span>
                <span style={{color:V.muted,fontSize:11}}>r{g.revision}</span>
            </div>
            <div style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:6}}>
                {g.checks.map((x,i)=><div key={x} style={{padding:"7px 9px",border:`1px solid ${V.divider}`,borderRadius:5,color:V.muted,fontSize:12}}>
                    <span style={{color:wanted==="validated"?V.green:V.blue,marginRight:7}}>{wanted==="validated"?"✓":"○"}</span>{x}
                </div>)}
            </div>
        </section>)}
    </div>;
}
