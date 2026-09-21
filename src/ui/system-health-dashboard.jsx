import { restoreDashboardWindow, useDashboardWindowMemory } from "./dashboard-window-memory.js";

const HEALTH_PATH = "data/telemetry/health.json";
const INCIDENTS_PATH = "data/telemetry/incidents.json";
const SCRIPT_PATH = "src/ui/system-health-dashboard.jsx";
const WINDOW_KEY = "system-health";
const REFRESH_MS = 1_000;
const C = { page:"#0b1119", surface:"#111a26", raised:"#152131", border:"#294766", text:"#f3f6fb", muted:"#91a9c7", blue:"#2993ff", green:"#29d8a3", amber:"#ffb31a", red:"#ff5d68" };

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") return;
    const copies = ns.ps("home").filter((p) => p.filename === SCRIPT_PATH).sort((a,b) => a.pid-b.pid);
    if (copies.length && copies[0].pid !== ns.pid) return;

    ns.disableLog("sleep");
    const bridge = { snapshot: readSnapshot(ns) };
    ns.ui.openTail();
    ns.ui.setTailTitle("Full Stack — System Health");
    ns.clearLog();
    ns.printRaw(<HealthDashboard bridge={bridge} />);
    await ns.sleep(75);
    await restoreDashboardWindow(ns, WINDOW_KEY);

    while (true) {
        bridge.snapshot = readSnapshot(ns);
        await ns.sleep(REFRESH_MS);
    }
}

function HealthDashboard({ bridge }) {
    const rootRef = useDashboardWindowMemory(WINDOW_KEY);
    const [snapshot, setSnapshot] = React.useState(bridge.snapshot);
    React.useEffect(() => {
        const timer = setInterval(() => setSnapshot(bridge.snapshot), REFRESH_MS);
        return () => clearInterval(timer);
    }, [bridge]);

    const health = snapshot?.health;
    if (!health) return <Shell rootRef={rootRef}><Header /><div style={{padding:16,color:C.muted}}>Waiting for health telemetry…</div></Shell>;

    const unhealthy = health.services.filter((s) => s.health !== "healthy");
    const recent = (snapshot.incidents?.incidents ?? []).filter((x) => x.severity !== "info").slice(-5).reverse();
    const tone = health.overall === "healthy" ? C.green : health.overall === "failed" ? C.red : C.amber;

    return <Shell rootRef={rootRef}>
        <Header />
        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`}}>
            <span style={{width:11,height:11,borderRadius:"50%",background:tone,boxShadow:`0 0 12px ${tone}`}} />
            <strong style={{color:tone,letterSpacing:".05em"}}>{health.overall.toUpperCase()}</strong>
            <span style={{color:C.muted}}>{health.serviceCount} services</span>
            <span style={{marginLeft:"auto",color:C.muted,fontSize:12}}>updated {age(health.generatedAt)} ago</span>
        </div>
        {unhealthy.length ? <Section title="ACTIVE ISSUES">
            {unhealthy.map((s) => <Row key={s.instanceId} service={s} />)}
        </Section> : <div style={{padding:"14px",color:C.green,fontSize:13}}>All reporting services are healthy.</div>}
        {recent.length ? <Section title="RECENT INCIDENTS">
            {recent.map((x,i) => <div key={i} style={{display:"grid",gridTemplateColumns:"120px 80px 1fr",gap:10,padding:"5px 0",fontSize:12}}>
                <span style={{color:C.text}}>{x.service}</span>
                <span style={{color:x.severity==="error"?C.red:C.amber}}>{x.severity.toUpperCase()}</span>
                <span style={{color:C.muted}}>{x.message}</span>
            </div>)}
        </Section> : null}
        <Section title="SERVICE PLACEMENT">
            {health.services.map((s) => <div key={s.instanceId} style={{display:"grid",gridTemplateColumns:"150px 90px 70px 1fr",gap:10,padding:"4px 0",fontSize:12}}>
                <span style={{color:C.text}}>{s.service}</span><span style={{color:C.muted}}>{s.host}</span>
                <span style={{color:C.muted}}>pid {s.pid}</span><span style={{color:healthColor(s.health)}}>{s.health.toUpperCase()}</span>
            </div>)}
        </Section>
    </Shell>;
}

function Row({ service }) {
    return <div style={{display:"grid",gridTemplateColumns:"150px 90px 1fr",gap:10,padding:"6px 0",fontSize:12}}>
        <span style={{color:C.text}}>{service.service}</span>
        <span style={{color:healthColor(service.health),fontWeight:700}}>{service.health.toUpperCase()}</span>
        <span style={{color:C.muted}}>{service.reason ?? `${service.host} · pid ${service.pid}`}</span>
    </div>;
}
function Section({ title, children }) {
    return <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`}}><div style={{fontSize:10,color:C.muted,letterSpacing:".1em",fontWeight:750,marginBottom:5}}>{title}</div>{children}</div>;
}
function Header() {
    return <div style={{height:36,padding:"0 14px",display:"flex",alignItems:"center",gap:9,color:"#b8d2f3",fontSize:11,fontWeight:750,letterSpacing:".09em"}}><span style={{color:C.blue}}>◆</span> FULL STACK — SYSTEM HEALTH</div>;
}
function Shell({rootRef,children}) {
    return <div ref={rootRef} style={{fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',minWidth:560,padding:10,background:C.page,color:C.text}}><div style={{overflow:"hidden",border:`1px solid ${C.border}`,borderRadius:10,background:`linear-gradient(180deg,${C.raised},${C.surface})`}}>{children}</div></div>;
}
function healthColor(value){ return value==="healthy"?C.green:value==="failed"?C.red:C.amber; }
function age(at){ if(!Number.isFinite(at))return "—"; const ms=Math.max(0,Date.now()-at); return ms<1000?`${Math.floor(ms)}ms`:ms<60000?`${Math.floor(ms/1000)}s`:`${Math.floor(ms/60000)}m`; }
function readSnapshot(ns){ return {health:readJson(ns,HEALTH_PATH),incidents:readJson(ns,INCIDENTS_PATH)}; }
function readJson(ns,path){ if(!ns.fileExists(path,"home"))return null; try{return JSON.parse(ns.read(path));}catch{return null;} }
