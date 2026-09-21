import { applyDashboardPosition, applyDashboardSize, restoreDashboardPosition, useDashboardWindow } from "./dashboard-window-memory.js";
import { DashboardAnchorControl } from "./dashboard-anchor-control.jsx";

/**
 * Ultra-compact React update dashboard for M1.
 * React never calls Netscript directly; main() owns all Netscript access.
 */

const STATUS_PATH = "data/update-status.json";
const COMMAND_PATH = "data/update-command.json";
const SCRIPT_PATH = "src/ui/update-dashboard.jsx";
const WINDOW_MEMORY_KEY = "update-watcher";
const REFRESH_MS = 1_000;
const LAYOUT_GROUP = "operations";

const COLORS = {
    page: "#0b1119",
    surface: "#111a26",
    surfaceRaised: "#152131",
    border: "#294766",
    divider: "#25384d",
    text: "#f3f6fb",
    muted: "#91a9c7",
    accent: "#2993ff",
    success: "#29d8a3",
    warning: "#ffb31a",
    danger: "#ff5d68",
};

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | update-dashboard must run on home");
        return;
    }

    const dashboards = ns.ps("home")
        .filter((process) => process.filename === SCRIPT_PATH)
        .sort((a, b) => a.pid - b.pid);
    if (dashboards.length > 0 && dashboards[0].pid !== ns.pid) return;

    ns.disableLog("sleep");
    const bridge = { snapshot: readSnapshot(ns), pendingIntent: null, feedback: "", desiredSize: null, appliedSize: null, desiredPosition: null, appliedPosition: null, layout: null };

    ns.ui.openTail();
    ns.ui.setTailTitle("Full Stack — Update Watcher");
    ns.clearLog();
    ns.printRaw(<UpdateDashboard bridge={bridge} />);
    await ns.sleep(75);
    await restoreDashboardPosition(ns, WINDOW_MEMORY_KEY);

    while (true) {
        if (bridge.pendingIntent) {
            bridge.feedback = handleIntent(ns, bridge.pendingIntent);
            bridge.pendingIntent = null;
        }
        bridge.snapshot = readSnapshot(ns);
        applyDashboardSize(ns, bridge);
        applyDashboardPosition(ns, bridge);
        await ns.sleep(REFRESH_MS);
    }
}

function handleIntent(ns, intent) {
    if (ns.fileExists(COMMAND_PATH, "home")) return "Command already queued.";
    const command = {
        schemaVersion: 1,
        id: `ui-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
        action: intent.action,
        revision: intent.revision,
        createdAt: Date.now(),
        origin: "update-dashboard",
    };
    ns.write(COMMAND_PATH, JSON.stringify(command, null, 2), "w");
    return `${intent.action === "approve" ? "Installing" : "Deferred"} r${intent.revision}.`;
}

function readSnapshot(ns) {
    return { status: readJson(ns, STATUS_PATH), capturedAt: Date.now() };
}

function UpdateDashboard({ bridge }) {
    const windowRef = useDashboardWindow(WINDOW_MEMORY_KEY, bridge, { minWidth: 620, minHeight: 126, maxWidth: 820, maxHeight: 260, layoutGroup: LAYOUT_GROUP, layoutOrder: 10, layoutGap: 6 });
    const [view, setView] = React.useState(() => ({ snapshot: bridge.snapshot, feedback: bridge.feedback }));

    React.useEffect(() => {
        const timer = setInterval(() => setView({ snapshot: bridge.snapshot, feedback: bridge.feedback }), REFRESH_MS);
        return () => clearInterval(timer);
    }, [bridge]);

    const status = view.snapshot?.status;
    if (!status) return <Shell rootRef={windowRef}><StateText>Waiting for update watcher telemetry…</StateText></Shell>;

    const heartbeatAge = Number.isFinite(status.heartbeatAt) ? Math.max(0, Date.now() - status.heartbeatAt) : null;
    const heartbeatFresh = heartbeatAge !== null && heartbeatAge < 15_000;
    const updateRevision = status.presentedRevision;
    const updateAvailable = status.phase === "update-available" && Number.isSafeInteger(updateRevision);
    const version = release(status.local);
    const interval = formatInterval(status.pollIntervalMs);
    const install = installationState(status);

    function send(action) {
        if (!updateAvailable) {
            bridge.feedback = "No update is awaiting approval.";
            return;
        }
        if (bridge.pendingIntent) {
            bridge.feedback = "Command already queued.";
            return;
        }
        bridge.pendingIntent = { action, revision: updateRevision };
        bridge.feedback = `${action === "approve" ? "Approving" : "Deferring"} r${updateRevision}…`;
    }

    return (
        <Shell rootRef={windowRef}>
            <Header>
                <CubeIcon />
                <span>UPDATE WATCHER</span>
                <DashboardAnchorControl group={LAYOUT_GROUP} id={WINDOW_MEMORY_KEY} bridge={bridge} accent={COLORS.accent} muted={COLORS.muted} />
            </Header>

            <StatusRow>
                <Version>{version}</Version>

                {updateAvailable ? (
                    <UpdateBadge>↑ r{updateRevision} available</UpdateBadge>
                ) : (
                    <Online fresh={heartbeatFresh} />
                )}

                {install ? <InstallBadge state={install} /> : null}

                <Divider />
                <Metric icon="♡" value={heartbeatAge === null ? "—" : `${formatAge(heartbeatAge)} ago`} danger={!heartbeatFresh} />
                <Divider />
                <Metric icon="↻" value={interval} />

                {updateAvailable ? (
                    <>
                        <Divider />
                        <ActionButton primary onClick={() => send("approve")}>Install</ActionButton>
                        <ActionButton onClick={() => send("decline")}>Later</ActionButton>
                    </>
                ) : null}
            </StatusRow>

            {install?.message ? <Feedback tone={install.tone}>{install.message}</Feedback> : (view.feedback ? <Feedback>{view.feedback}</Feedback> : null)}
            {status.error && install?.tone !== "success" ? <ErrorLine>{status.error}</ErrorLine> : null}
        </Shell>
    );
}

function Shell({ rootRef, children }) {
    return (
        <div ref={rootRef} style={{
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
            minWidth: "620px",
            padding: "10px",
            background: COLORS.page,
            color: COLORS.text,
        }}>
            <div style={{
                overflow: "hidden",
                border: `1px solid ${COLORS.border}`,
                borderRadius: "10px",
                background: `linear-gradient(180deg, ${COLORS.surfaceRaised}, ${COLORS.surface})`,
                boxShadow: "0 10px 30px rgba(0,0,0,0.28)",
            }}>
                {children}
            </div>
        </div>
    );
}

function Header({ children }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            height: "38px",
            padding: "0 14px",
            color: "#b8d2f3",
            fontSize: "12px",
            fontWeight: 750,
            letterSpacing: "0.09em",
            borderBottom: `1px solid ${COLORS.divider}`,
        }}>
            {children}
        </div>
    );
}

function StatusRow({ children }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            minHeight: "58px",
            padding: "0 14px",
            whiteSpace: "nowrap",
        }}>
            {children}
        </div>
    );
}

function Version({ children }) {
    return <span style={{ fontSize: "24px", fontWeight: 760, letterSpacing: "-0.025em" }}>{children}</span>;
}

function Online({ fresh }) {
    return (
        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: fresh ? COLORS.success : COLORS.danger, fontWeight: 700 }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "currentColor", boxShadow: "0 0 12px currentColor" }} />
            {fresh ? "ONLINE" : "STALE"}
        </span>
    );
}

function InstallBadge({ state }) {
    const palette = state.tone === "success"
        ? { color: COLORS.success, border: "#237f68", background: "rgba(41,216,163,0.10)" }
        : state.tone === "danger"
            ? { color: COLORS.danger, border: "#8f3941", background: "rgba(255,93,104,0.10)" }
            : { color: COLORS.accent, border: COLORS.border, background: "rgba(41,147,255,0.10)" };
    return (
        <span style={{
            padding: "7px 10px",
            border: `1px solid ${palette.border}`,
            borderRadius: "7px",
            background: palette.background,
            color: palette.color,
            fontSize: "12px",
            fontWeight: 750,
        }}>
            {state.label}
        </span>
    );
}

function UpdateBadge({ children }) {
    return (
        <span style={{
            padding: "8px 12px",
            border: `1px solid #9a6a0a`,
            borderRadius: "7px",
            background: "rgba(255,179,26,0.12)",
            color: COLORS.warning,
            fontWeight: 750,
            boxShadow: "inset 0 0 16px rgba(255,179,26,0.06)",
        }}>
            {children}
        </span>
    );
}

function Metric({ icon, value, danger = false }) {
    return (
        <span style={{ display: "flex", alignItems: "center", gap: "8px", color: danger ? COLORS.danger : "#b6cae4" }}>
            <span style={{ color: danger ? COLORS.danger : COLORS.accent, fontSize: "20px", lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>{value}</span>
        </span>
    );
}

function Divider() {
    return <span style={{ width: "1px", height: "28px", background: COLORS.divider, flex: "0 0 1px" }} />;
}

function ActionButton({ primary = false, onClick, children }) {
    return (
        <button onClick={onClick} style={{
            minWidth: "76px",
            height: "36px",
            padding: "0 16px",
            borderRadius: "7px",
            border: primary ? `1px solid #4aa8ff` : `1px solid ${COLORS.border}`,
            background: primary ? "linear-gradient(180deg, #329eff, #177ee3)" : "#172334",
            color: primary ? "white" : "#b8cce5",
            fontSize: "14px",
            fontWeight: 750,
            cursor: "pointer",
            boxShadow: primary ? "0 4px 12px rgba(41,147,255,0.24)" : "none",
        }}>
            {children}
        </button>
    );
}

function CubeIcon() {
    return (
        <span style={{
            display: "grid",
            placeItems: "center",
            width: "22px",
            height: "22px",
            border: `2px solid ${COLORS.accent}`,
            borderRadius: "5px",
            color: COLORS.accent,
            fontSize: "11px",
            transform: "rotate(45deg)",
        }}>
            <span style={{ transform: "rotate(-45deg)", fontWeight: 900 }}>F</span>
        </span>
    );
}

function Feedback({ children, tone = "muted" }) {
    const color = tone === "success" ? COLORS.success : tone === "danger" ? COLORS.danger : COLORS.muted;
    return <div style={{ padding: "0 14px 8px", color, fontSize: "11px" }}>{children}</div>;
}

function ErrorLine({ children }) {
    return <div style={{ padding: "0 14px 8px", color: COLORS.danger, fontSize: "11px" }}>ERROR: {children}</div>;
}

function StateText({ children }) {
    return <div style={{ padding: "18px", color: COLORS.muted }}>{children}</div>;
}

function installationState(status) {
    const deployment = status?.deployment;
    const report = deployment?.report;
    const revision = Number.isSafeInteger(report?.remote?.revision) ? report.remote.revision : deployment?.requestedRevision;

    if (deployment?.running || ["puller", "self-refresh", "runtime-reconcile"].includes(deployment?.phase)) {
        return {
            tone: "active",
            label: Number.isSafeInteger(revision) ? `↻ Installing r${revision}` : "↻ Installing",
            message: Number.isSafeInteger(revision) ? `Installation r${revision} is still in progress.` : "Installation is still in progress.",
        };
    }

    if (!report || !Number.isSafeInteger(revision)) return null;

    if (report.status === "committed" && report.success === true && report.clean === true) {
        return {
            tone: "success",
            label: "✓ Install clean",
            message: `Last installation completed successfully (r${revision}).`,
        };
    }

    if (report.status === "committed-runtime-degraded" || report.status === "failed" || report.success === false || report.clean === false) {
        return {
            tone: "danger",
            label: report.status === "committed-runtime-degraded" ? "! Install degraded" : "! Install failed",
            message: report.error || `Last installation did not finish cleanly (r${revision}).`,
        };
    }

    return null;
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

function release(value) {
    return value?.version && Number.isSafeInteger(value?.revision) ? `${value.version}-r${value.revision}` : "—";
}

function formatInterval(value) {
    if (!Number.isFinite(value)) return "—";
    if (value < 1_000) return `${value}ms`;
    return `${Math.round(value / 1_000)}s`;
}

function formatAge(value) {
    if (!Number.isFinite(value)) return "unknown";
    if (value < 1_000) return `${Math.max(0, Math.floor(value))}ms`;
    if (value < 60_000) return `${Math.floor(value / 1_000)}s`;
    return `${Math.floor(value / 60_000)}m`;
}
