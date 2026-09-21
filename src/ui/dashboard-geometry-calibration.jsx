const TARGETS = [
    { width: 600, height: 300 },
    { width: 720, height: 420 },
    { width: 840, height: 540 },
];
const POLL_MS = 250;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") return;
    ns.disableLog("sleep");

    const bridge = {
        targetIndex: 0,
        requestedIndex: 0,
        measurement: null,
    };

    ns.ui.openTail();
    ns.ui.setTailTitle("Full Stack — Geometry Calibration");
    ns.clearLog();
    ns.printRaw(<CalibrationDashboard bridge={bridge} />);

    await ns.sleep(100);
    applyTarget(ns, bridge);

    while (true) {
        if (bridge.requestedIndex !== bridge.targetIndex) {
            bridge.targetIndex = bridge.requestedIndex;
            applyTarget(ns, bridge);
        }
        await ns.sleep(POLL_MS);
    }
}

function applyTarget(ns, bridge) {
    const target = TARGETS[bridge.targetIndex] ?? TARGETS[0];
    ns.ui.resizeTail(target.width, target.height, ns.pid);
}

function CalibrationDashboard({ bridge }) {
    const rootRef = React.useRef(null);
    const [measurement, setMeasurement] = React.useState(null);
    const [selected, setSelected] = React.useState(bridge.targetIndex);

    React.useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;
        const measure = () => {
            const resizable = root.closest?.(".react-resizable") ?? null;
            const frame = resizable?.parentElement ?? null;
            const rootRect = box(root);
            const resizableRect = box(resizable);
            const frameRect = box(frame);
            const target = TARGETS[bridge.targetIndex] ?? TARGETS[0];
            const next = {
                target,
                root: rootRect,
                rootScroll: { width: root.scrollWidth, height: root.scrollHeight },
                resizable: resizableRect,
                frame: frameRect,
                rootFromResizable: delta(rootRect, resizableRect),
                rootFromFrame: delta(rootRect, frameRect),
                targetMinusRoot: {
                    width: round(target.width - rootRect.width),
                    height: round(target.height - rootRect.height),
                },
                targetMinusResizable: {
                    width: round(target.width - resizableRect.width),
                    height: round(target.height - resizableRect.height),
                },
            };
            bridge.measurement = next;
            setMeasurement(next);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        const resizable = root.closest?.(".react-resizable");
        if (resizable) observer.observe(resizable);
        measure();
        const timer = setInterval(measure, 300);
        return () => {
            clearInterval(timer);
            observer.disconnect();
        };
    }, [bridge, selected]);

    const choose = (index) => {
        bridge.requestedIndex = index;
        setSelected(index);
    };

    return <div ref={rootRef} style={styles.root}>
        <div style={styles.header}>
            <strong>GEOMETRY CALIBRATION</strong>
            <span style={styles.muted}>Known resizeTail target → measured DOM</span>
        </div>
        <div style={styles.targets}>
            {TARGETS.map((target, index) =>
                <button key={index} onClick={() => choose(index)} style={index === selected ? styles.activeButton : styles.button}>
                    {target.width} × {target.height}
                </button>)}
        </div>
        <div style={styles.grid}>
            <Metric label="Requested native tail" value={fmtTarget(measurement?.target)} />
            <Metric label="React root bounds" value={fmtBox(measurement?.root)} />
            <Metric label="React root scroll" value={fmtSize(measurement?.rootScroll)} />
            <Metric label=".react-resizable bounds" value={fmtBox(measurement?.resizable)} />
            <Metric label="Native frame bounds" value={fmtBox(measurement?.frame)} />
            <Metric label="Root offset from resizable" value={fmtDelta(measurement?.rootFromResizable)} />
            <Metric label="Root offset from frame" value={fmtDelta(measurement?.rootFromFrame)} />
            <Metric label="Requested − root" value={fmtSize(measurement?.targetMinusRoot)} emphasis />
            <Metric label="Requested − resizable" value={fmtSize(measurement?.targetMinusResizable)} emphasis />
        </div>
        <div style={styles.note}>Select each target after the window settles. A screenshot of all three target measurements will tell us whether the correction is fixed or size-dependent.</div>
    </div>;
}

function Metric({ label, value, emphasis = false }) {
    return <div style={styles.metric}>
        <span style={styles.label}>{label}</span>
        <span style={emphasis ? styles.emphasis : styles.value}>{value}</span>
    </div>;
}

function box(node) {
    if (!node?.getBoundingClientRect) return emptyBox();
    const r = node.getBoundingClientRect();
    return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
}
function emptyBox() { return { x: NaN, y: NaN, width: NaN, height: NaN }; }
function delta(a, b) {
    return { x: round(a.x - b.x), y: round(a.y - b.y), width: round(b.width - a.width), height: round(b.height - a.height) };
}
function fmtTarget(v) { return v ? `${v.width} × ${v.height}` : "measuring…"; }
function fmtSize(v) { return v ? `${show(v.width)} × ${show(v.height)}` : "measuring…"; }
function fmtBox(v) { return v ? `${show(v.width)} × ${show(v.height)} @ ${show(v.x)}, ${show(v.y)}` : "measuring…"; }
function fmtDelta(v) { return v ? `x ${show(v.x)} · y ${show(v.y)} · Δw ${show(v.width)} · Δh ${show(v.height)}` : "measuring…"; }
function show(v) { return Number.isFinite(v) ? String(v) : "—"; }
function round(v) { return Number.isFinite(v) ? Math.round(v * 10) / 10 : NaN; }

const styles = {
    root: { boxSizing:"border-box", width:"100%", padding:12, background:"#0b1119", color:"#f3f6fb", fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' },
    header: { display:"flex", justifyContent:"space-between", gap:16, padding:"10px 12px", border:"1px solid #294766", borderRadius:8, background:"#152131", color:"#b8d2f3", fontSize:11, letterSpacing:".08em" },
    muted: { color:"#91a9c7", letterSpacing:0 },
    targets: { display:"flex", gap:8, margin:"10px 0" },
    button: { padding:"6px 10px", border:"1px solid #294766", borderRadius:6, background:"#111a26", color:"#91a9c7", cursor:"pointer" },
    activeButton: { padding:"6px 10px", border:"1px solid #2993ff", borderRadius:6, background:"#152131", color:"#f3f6fb", cursor:"pointer" },
    grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 },
    metric: { display:"flex", justifyContent:"space-between", gap:12, padding:"7px 9px", border:"1px solid #223b55", background:"#111a26", fontSize:11 },
    label: { color:"#91a9c7" },
    value: { color:"#f3f6fb", fontFamily:"monospace" },
    emphasis: { color:"#29d8a3", fontFamily:"monospace", fontWeight:700 },
    note: { marginTop:10, padding:"8px 10px", borderLeft:"3px solid #2993ff", color:"#91a9c7", background:"#111a26", fontSize:11 },
};
