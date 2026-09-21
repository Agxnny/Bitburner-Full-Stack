import { V, panel, sectionTitle, tone } from "./validation-theme.js";
import { validationSummaryFrom } from "../validation/validation-state.js";

export function ValidationOverviewTab({ snapshot, navigate }) {
    const health=snapshot.health;
    const update=snapshot.update;
    const summary=validationSummaryFrom(snapshot.validationPlan,snapshot.validationLedger);
    const unhealthy=health?.services?.filter((s)=>s.health!=="healthy") ?? [];
    const updateAvailable=update?.phase==="update-available" && Number.isSafeInteger(update?.presentedRevision);
    return <div style={{display:"grid",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr 1fr 1.2fr",gap:12}}>
            <Card title="SYSTEM STATUS"><Big color={tone(health?.overall)}>{(health?.overall ?? "waiting").toUpperCase()}</Big><Small>{health?.serviceCount ?? 0} reporting services</Small></Card>
            <Card title="DEPLOYMENT"><Big>{release(update?.local)}</Big><Small>{updateAvailable ? `r${update.presentedRevision} available` : "No update awaiting approval"}</Small></Card>
            <Card title="SERVICES"><Big color={unhealthy.length ? V.amber : V.green}>{(health?.serviceCount ?? 0)-unhealthy.length} / {health?.serviceCount ?? 0}</Big><Small>{unhealthy.length ? `${unhealthy.length} require attention` : "Healthy"}</Small></Card>
            <Card title="VALIDATION"><Big>{summary.validatedChecks} validated</Big><Small>{summary.validatingChecks} checks still active</Small></Card>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:12}}>
            <Card title="ATTENTION">
                {!unhealthy.length && !updateAvailable && summary.validatingGroups===0 ? <Small>Nothing currently requires attention.</Small> : null}
                {unhealthy.length ? <Action tone={V.red} onClick={()=>navigate("health")}>{unhealthy.length} unhealthy service{unhealthy.length===1?"":"s"} →</Action> : null}
                {updateAvailable ? <Action tone={V.amber} onClick={()=>navigate("updater")}>Update r{update.presentedRevision} available →</Action> : null}
                {summary.validatingGroups ? <Action tone={V.blue} onClick={()=>navigate("validating")}>{summary.validatingGroups} validation groups active →</Action> : null}
            </Card>
            <Card title="RECENT EVENTS">
                {(snapshot.incidents?.incidents ?? []).slice(-6).reverse().map((x,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"90px 150px 1fr",gap:10,padding:"5px 0",borderBottom:`1px solid ${V.divider}`,fontSize:12}}>
                    <span style={{color:V.muted}}>{clock(x.at)}</span><span>{x.service}</span><span style={{color:x.severity==="error"?V.red:x.severity==="warning"?V.amber:V.muted}}>{x.message}</span>
                </div>)}
            </Card>
        </div>
    </div>;
}
function Card({title,children}) { return <section style={{...panel,padding:14,minHeight:92}}><div style={sectionTitle}>{title}</div><div style={{marginTop:10}}>{children}</div></section>; }
function Big({children,color=V.text}) { return <div style={{fontSize:22,fontWeight:800,color}}>{children}</div>; }
function Small({children}) { return <div style={{marginTop:7,color:V.muted,fontSize:12}}>{children}</div>; }
function Action({children,tone,onClick}) { return <button onClick={onClick} style={{display:"block",width:"100%",textAlign:"left",margin:"6px 0",padding:"9px 10px",border:`1px solid ${V.border}`,borderRadius:6,background:V.raised,color:tone,cursor:"pointer"}}>{children}</button>; }
function release(v){return v?.version&&Number.isSafeInteger(v.revision)?`${v.version}-r${v.revision}`:"—";}
function clock(at){return Number.isFinite(at)?new Date(at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"—";}
