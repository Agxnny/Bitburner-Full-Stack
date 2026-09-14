/**
 * React update dashboard for M1 deployment validation.
 * React never calls Netscript directly; main() owns all Netscript access.
 */

const STATUS_PATH = "data/update-status.json";
const COMMAND_PATH = "data/update-command.json";
const REPORT_PATH = "data/git-pull-report.json";
const SCRIPT_PATH = "src/ui/update-dashboard.jsx";
const REFRESH_MS = 1_000;

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
    const bridge = {
        snapshot: readSnapshot(ns),
        pendingIntent: null,
        feedback: "",
    };

    ns.ui.openTail();
    ns.ui.setTailTitle("Bitburner Full Stack — Updates");
    ns.clearLog();
    ns.printRaw(<UpdateDashboard bridge={bridge} />);

    while (true) {
        if (bridge.pendingIntent) {
            bridge.feedback = handleIntent(ns, bridge.pendingIntent);
            bridge.pendingIntent = null;
        }

        bridge.snapshot = readSnapshot(ns);
        await ns.sleep(REFRESH_MS);
    }
}

function handleIntent(ns, intent) {
    if (ns.fileExists(COMMAND_PATH, "home")) {
        return "An update command is already waiting to be handled.";
    }

    const command = {
        schemaVersion: 1,
        id: `ui-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
        action: intent.action,
        revision: intent.revision,
        createdAt: Date.now(),
        origin: "update-dashboard",
    };
    ns.write(COMMAND_PATH, JSON.stringify(command, null, 2), "w");
    return `${intent.action === "approve" ? "Approved" : "Declined"} r${intent.revision}; waiting for watcher.`;
}

function readSnapshot(ns) {
    return {
        status: readJson(ns, STATUS_PATH),
        report: readJson(ns, REPORT_PATH),
        capturedAt: Date.now(),
    };
}

function UpdateDashboard({ bridge }) {
    const [view, setView] = React.useState(() => ({
        snapshot: bridge.snapshot,
        feedback: bridge.feedback,
    }));

    React.useEffect(() => {
        const timer = setInterval(() => {
            setView({ snapshot: bridge.snapshot, feedback: bridge.feedback });
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [bridge]);

    const status = view.snapshot?.status;
    const report = view.snapshot?.report;

    function send(action) {
        const revision = status?.presentedRevision;
        if (status?.phase !== "update-available" || !Number.isSafeInteger(revision)) {
            bridge.feedback = "No current update presentation to respond to.";
            return;
        }
        if (bridge.pendingIntent) {
            bridge.feedback = "An update command is already queued for the dashboard loop.";
            return;
        }
        bridge.pendingIntent = { action, revision };
        bridge.feedback = `${action === "approve" ? "Approving" : "Declining"} r${revision}…`;
    }

    if (!status) {
        return <Panel title="Update Status"><p>No watcher telemetry found. Start src/bootstrap/update-watcher.js.</p></Panel>;
    }

    const heartbeatAge = status.heartbeatAt ? Date.now() - status.heartbeatAt : null;
    const heartbeatFresh = heartbeatAge !== null && heartbeatAge < 15_000;
    const deploymentReport = status.deployment?.report ?? summarizeReport(report);
    const runtimeUnits = deploymentReport?.runtime?.units ?? [];

    return (
        <div style={{ fontFamily: "monospace", minWidth: "560px", padding: "8px" }}>
            <Panel title="Update Service">
                <Row label="Watcher" value={`${status.health ?? "unknown"} / ${status.phase ?? "unknown"}`} />
                <Row label="Lifecycle" value={status.lifecycle ?? "—"} />
                <Row label="Watcher PID" value={status.watcherPid ?? "—"} />
                <Row label="Dashboard" value={dashboardStatus(status.dashboard)} />
                <Row label="Heartbeat" value={heartbeatFresh ? `${formatAge(heartbeatAge)} ago` : `STALE (${formatAge(heartbeatAge)} ago)`} />
                <Row label="Local" value={release(status.local)} />
                <Row label="Remote" value={release(status.remote)} />
                <Row label="Last check" value={formatTime(status.lastCheckAt)} />
                <Row label="Next check" value={formatTime(status.nextCheckAt)} />
                {status.dashboard?.error ? <ErrorText>{status.dashboard.error}</ErrorText> : null}
                {status.error ? <ErrorText>{status.error}</ErrorText> : null}
            </Panel>

            <Panel title="Approval">
                {status.phase === "update-available" ? (
                    <>
                        <p>Revision r{status.presentedRevision} is available. Installation requires explicit approval.</p>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => send("approve")}>Yes — install r{status.presentedRevision}</button>
                            <button onClick={() => send("decline")}>No</button>
                        </div>
                    </>
                ) : <p>{approvalMessage(status)}</p>}
                {view.feedback ? <p>{view.feedback}</p> : null}
                {status.lastCommand ? <Row label="Last command" value={`${status.lastCommand.action ?? "?"} r${status.lastCommand.revision ?? "?"} → ${status.lastCommand.outcome ?? "?"}`} /> : null}
                {status.lastCommand?.error ? <ErrorText>{status.lastCommand.error}</ErrorText> : null}
            </Panel>

            <Panel title="Deployment">
                <Row label="Phase" value={status.deployment?.phase ?? "—"} />
                <Row label="Running" value={status.deployment?.running ? "yes" : "no"} />
                <Row label="Puller PID" value={status.deployment?.pullerPid ?? "—"} />
                <Row label="Helper PID" value={status.deployment?.helperPid ?? "—"} />
                <Row label="Requested" value={status.deployment?.requestedRevision != null ? `r${status.deployment.requestedRevision}` : "—"} />
                <Row label="Result" value={deploymentReport?.status ?? "—"} />
                <Row label="Release" value={release(deploymentReport?.remote)} />
                <Row label="Runtime" value={deploymentReport?.runtime?.status ?? "—"} />
                {runtimeUnits.map((unit) => (
                    <Row key={unit.id} label={`↳ ${unit.id}`} value={`${unit.outcome ?? "—"}${unit.pid ? ` (pid ${unit.pid})` : ""}`} />
                ))}
                {deploymentReport?.error ? <ErrorText>{deploymentReport.error}</ErrorText> : null}
            </Panel>
        </div>
    );
}

function Panel({ title, children }) {
    return <section style={{ border: "1px solid currentColor", borderRadius: "6px", padding: "10px", marginBottom: "10px" }}><h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>{children}</section>;
}

function Row({ label, value }) {
    return <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px", marginBottom: "4px" }}><strong>{label}</strong><span>{value ?? "—"}</span></div>;
}

function ErrorText({ children }) { return <p style={{ fontWeight: "bold" }}>ERROR: {children}</p>; }

function approvalMessage(status) {
    if (status.phase === "current") return "Deployment is current.";
    if (status.phase === "checking") return "Checking for updates…";
    if (status.phase === "deploying") return "Approved deployment is running.";
    if (status.phase === "dismissed") return `Revision r${status.dismissedRevision} was declined. It may be presented again after the next poll.`;
    if (status.phase === "stale-remote") return "Remote revision is older than the committed local revision; no install is offered.";
    if (status.phase === "error") return "Watcher could not verify the remote release.";
    return "No update approval is currently available.";
}

function dashboardStatus(value) {
    if (!value) return "unknown";
    if (value.running) return `running (pid ${value.pid}, starts ${value.restartCount ?? 0})`;
    return `not running (starts ${value.restartCount ?? 0})`;
}

function summarizeReport(report) {
    if (!report) return null;
    return {
        status: report.status ?? null,
        success: report.success ?? null,
        clean: report.clean ?? null,
        remote: report.remote ?? null,
        runtime: report.runtime ?? null,
        error: report.error ?? null,
        finishedAt: report.finishedAt ?? null,
    };
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

function release(value) {
    return value?.version && Number.isSafeInteger(value?.revision) ? `${value.version}-r${value.revision}` : "—";
}

function formatTime(value) { return Number.isFinite(value) ? new Date(value).toLocaleTimeString() : "—"; }
function formatAge(value) {
    if (!Number.isFinite(value)) return "unknown";
    if (value < 1_000) return `${value}ms`;
    if (value < 60_000) return `${Math.floor(value / 1_000)}s`;
    return `${Math.floor(value / 60_000)}m`;
}
