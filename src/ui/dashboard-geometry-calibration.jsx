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

    const bridge = { targetIndex: 0, requestedIndex: 0 };
    ns.ui.openTail();
    ns.ui.setTailTitle("Full Stack — DOM Calibration");
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
    const topRef = React.useRef(null);
    const bottomRef = React.useRef(null);
    const [measurement, setMeasurement] = React.useState(null);
    const [selected, setSelected] = React.useState(bridge.targetIndex);

    React.useEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        const measure = () => {
            const target = TARGETS[bridge.targetIndex] ?? TARGETS[0];
            const resizable = root.closest?.(".react-resizable") ?? null;
            const rootRect = box(root);
            const chain = ancestorChain(root, resizable, rootRect);
            setMeasurement({
                target,
                root: describeNode(root, rootRect, rootRect),
                topMarker: marker(topRef.current, rootRect),
                bottomMarker: marker(bottomRef.current, rootRect),
                chain,
            });
        };

        const observer = new ResizeObserver(measure);
        observer.observe(root);
        const resizable = root.closest?.(".react-resizable");
        if (resizable) observer.observe(resizable);
        measure();
        const timer = setInterval(measure, 300);
        return () => { clearInterval(timer); observer.disconnect(); };
    }, [bridge, selected]);

    const choose = (index) => {
        bridge.requestedIndex = index;
        setSelected(index);
    };

    return <div ref={rootRef} style={styles.root}>
        <div ref={topRef} style={styles.marker}>TOP CONTENT MARKER</div>
        <div style={styles.header}>
            <strong>DOM-CHAIN CALIBRATION</strong>
            <span style={styles.muted}>resizeTail target → ancestor geometry</span>
        </div>
        <div style={styles.targets}>
            {TARGETS.map((target, index) =>
                <button key={index} onClick={() => choose(index)} style={index === selected ? styles.activeButton : styles.button}>
                    {target.width} × {target.height}
                </button>)}
        </div>
        <div style={styles.summary}>
            <Metric label="Requested native tail" value={fmtTarget(measurement?.target)} />
            <Metric label="React root" value={fmtNode(measurement?.root)} />
            <Metric label="Top marker" value={fmtMarker(measurement?.topMarker)} />
            <Metric label="Bottom marker" value={fmtMarker(measurement?.bottomMarker)} />
        </div>
        <div style={styles.chainTitle}>ANCESTOR CHAIN — ROOT → .react-resizable</div>
        <div style={styles.chain}>
            {(measurement?.chain ?? []).map((item, index) => <Ancestor key={index} index={index} item={item} />)}
        </div>
        <div ref={bottomRef} style={styles.marker}>BOTTOM CONTENT MARKER</div>
    </div>;
}

function Ancestor({ index, item }) {
    return <div style={styles.ancestor}>
        <div style={styles.ancestorHead}>
            <strong>#{index} {item.name}</strong>
            <span style={styles.emphasis}>{item.rect.width}×{item.rect.height} @ {item.rect.x},{item.rect.y}</span>
        </div>
        <div style={styles.details}>
            <span>client {item.client.width}×{item.client.height}</span>
            <span>scroll {item.scroll.width}×{item.scroll.height}</span>
            <span>scrollPos {item.scrollPosition.left},{item.scrollPosition.top}</span>
            <span>root Δ {item.rootOffset.x},{item.rootOffset.y}</span>
            <span>display {item.css.display}</span>
            <span>position {item.css.position}</span>
            <span>overflow {item.css.overflowX}/{item.css.overflowY}</span>
            <span>flex {item.css.flexDirection} · grow {item.css.flexGrow} · shrink {item.css.flexShrink}</span>
            <span>align {item.css.alignItems}</span>
            <span>justify {item.css.justifyContent}</span>
        </div>
    </div>;
}

function Metric({ label, value }) {
    return <div style={styles.metric}><span style={styles.label}>{label}</span><span style={styles.value}>{value}</span></div>;
}

function ancestorChain(root, stop, rootRect) {
    const result = [];
    let node = root;
    let guard = 0;
    while (node && guard < 12) {
        result.push(describeNode(node, box(node), rootRect));
        if (node === stop) break;
        node = node.parentElement;
        guard += 1;
    }
    return result;
}

function describeNode(node, rect, rootRect) {
    if (!node) return null;
    const css = getComputedStyle(node);
    return {
        name: nodeName(node),
        rect,
        client: { width: node.clientWidth, height: node.clientHeight },
        scroll: { width: node.scrollWidth, height: node.scrollHeight },
        scroll: { width: node.scrollWidth, height: node.scrollHeight },
        scrollPosition: { left: node.scrollLeft, top: node.scrollTop },
        rootOffset: { x: round(rootRect.x - rect.x), y: round(rootRect.y - rect.y) },
        css: {
            display: css.display,
            position: css.position,
            overflowX: css.overflowX,
            overflowY: css.overflowY,
            flexDirection: css.flexDirection,
            flexGrow: css.flexGrow,
            flexShrink: css.flexShrink,
            alignItems: css.alignItems,
            justifyContent: css.justifyContent,
        },
    };
}

function marker(node, rootRect) {
    if (!node) return null;
    const rect = box(node);
    return { y: rect.y, rootY: round(rect.y - rootRect.y), height: rect.height };
}

function nodeName(node) {
    const tag = String(node.tagName ?? "node").toLowerCase();
    const classes = [...(node.classList ?? [])].slice(0, 3).join(".");
    return classes ? `${tag}.${classes}` : tag;
}
function box(node) {
    if (!node?.getBoundingClientRect) return { x:NaN, y:NaN, width:NaN, height:NaN };
    const r = node.getBoundingClientRect();
    return { x:round(r.x), y:round(r.y), width:round(r.width), height:round(r.height) };
}
function fmtTarget(v) { return v ? `${v.width} × ${v.height}` : "measuring…"; }
function fmtNode(v) { return v ? `${v.rect.width}×${v.rect.height} · client ${v.client.width}×${v.client.height} · scroll ${v.scroll.width}×${v.scroll.height}` : "measuring…"; }
function fmtMarker(v) { return v ? `page y ${v.y} · root y ${v.rootY} · h ${v.height}` : "measuring…"; }
function round(v) { return Number.isFinite(v) ? Math.round(v * 10) / 10 : NaN; }

const styles = {
    root:{boxSizing:"border-box",width:"100%",padding:10,background:"#0b1119",color:"#f3f6fb",fontFamily:'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',fontSize:10},
    marker:{height:12,border:"1px solid #2993ff",color:"#29d8a3",fontSize:8,display:"flex",alignItems:"center",padding:"0 5px",background:"#101b28"},
    header:{display:"flex",justifyContent:"space-between",gap:12,padding:"7px 9px",marginTop:5,border:"1px solid #294766",background:"#152131",color:"#b8d2f3",letterSpacing:".07em"},
    muted:{color:"#91a9c7",letterSpacing:0},
    targets:{display:"flex",gap:6,margin:"6px 0"},
    button:{padding:"4px 8px",border:"1px solid #294766",borderRadius:5,background:"#111a26",color:"#91a9c7",cursor:"pointer"},
    activeButton:{padding:"4px 8px",border:"1px solid #2993ff",borderRadius:5,background:"#152131",color:"#f3f6fb",cursor:"pointer"},
    summary:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4},
    metric:{display:"flex",justifyContent:"space-between",gap:8,padding:"5px 7px",border:"1px solid #223b55",background:"#111a26"},
    label:{color:"#91a9c7"},
    value:{color:"#f3f6fb",fontFamily:"monospace"},
    chainTitle:{margin:"7px 0 4px",color:"#91a9c7",fontSize:9,letterSpacing:".09em",fontWeight:700},
    chain:{display:"flex",flexDirection:"column",gap:4,marginBottom:6},
    ancestor:{border:"1px solid #223b55",background:"#111a26",padding:"5px 7px"},
    ancestorHead:{display:"flex",justifyContent:"space-between",gap:8,color:"#b8d2f3"},
    emphasis:{color:"#29d8a3",fontFamily:"monospace"},
    details:{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:"2px 8px",marginTop:4,color:"#91a9c7",fontFamily:"monospace",fontSize:9},
};
