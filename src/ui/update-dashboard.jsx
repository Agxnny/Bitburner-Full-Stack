/**
 * Minimal React update dashboard for M1 deployment validation.
 * Reads watcher/deployment telemetry and emits standard update commands.
 */

const STATUS_PATH = "data/update-status.json";
const COMMAND_PATH = "data/update-command.json";
const REPORT_PATH = "data/git-pull-report.json";
const REFRESH_MS = 1_000;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | update-dashboard must run on home");
        return;
    }

    ns.disableLog("sleep");
    ns.ui.openTail();
    ns.ui.setTailTitle("Bitburner Full Stack — Updates");
    ns.clearLog();
    ns.printRaw(<UpdateDashboard ns={ns} />);

    while (true) await ns.sleep(60_000);
}

function UpdateDashboard({ ns }) {
    const [status, setStatus] = React.useState(() => readJson(ns, STATUS_PATH));
    const [report, setReport] = React.useState(() => readJson(ns, REPORT_PATH));
    const [feedback, setFeedback] = React.useState("");

    React.useEffect(() => {
        const timer = setInterval(() => {
            setStatus(readJson(ns, STATUS_PATH));
            setReport(readJson(ns, REPORT_PATH));
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [ns]);

    const remoteRevision = status?.remote?.revision;
    const canRespond = status?.phase === "update-available" && Number.isSafeInteger(remoteRevision);

    function send(action) {
        if (!canRespond) {
            setFeedback("No current update presentation to respond to.");
            return;
        }
        if (ns.fileExists(COMMAND_PATH, "home")) {
            setFeedback("An update command is already waiting to be handled.");
            return;
        }

        const command = {
            schemaVersion: 1,
            id: `ui-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
            action,
            revision: remoteRevision,
            createdAt: Date.now(),
            origin: "update-dashboard",
        };
        ns.write(COMMAND_PATH, JSON.stringify(command, null, 2), "w");
        setFeedback(`${action === "approve" ? "Approved" : "Declined"} r${remoteRevision}; waiting for watcher.`);
    }

    if (!status) {
        return <Panel title="Update Status"><p>No watcher telemetry found. Start src/bootstrap/update-watcher.js.</p></Panel>;
    }

    const heartbeatAge = status.heartbeatAt ? Date.now() - status.heartbeatAt : null;
    const heartbeatFresh = heartbeatAge !== null && heartbeatAge < 15_000;
    const deploymentReport = status.deployment?.report ?? summarizeReport(report);

    return (
        <div style={{ fontFamily: "monospace", minWidth: "520px", padding: "8px" }}>
            <Panel title="Update Status">
                <Row label="Watcher" value={`${status.health ?? "unknown"} / ${status.phase ?? "unknown"}`} />
                <Row label="Heartbeat" value={heartbeatFresh ? `${formatAge(heartbeatAge)} ago` : `STALE (${formatAge(heartbeatAge)} ago)`} />
                <Row label="Local" value={release(status.local)} />
                <Row label="Remote" value={release(status.remote)} />
                <Row label="Last check" value={formatTime(status.lastCheckAt)} />
                <Row label="Next check" value={formatTime(status.nextCheckAt)} />
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
                ) : (
                    <p>{approvalMessage(status)}</p>
                )}
                {feedback ? <p>{feedback}</p> : null}
                {status.lastCommand ? (
                    <Row
                        label="Last command"
                        value={`${status.lastCommand.action ?? "?"} r${status.lastCommand.revision ?? "?"} → ${status.lastCommand.outcome ?? "?"}`}
                    />
                ) : null}
                {status.lastCommand?.error ? <ErrorText>{status.lastCommand.error}</ErrorText> : null}
            </Panel>

            <Panel title="Deployment">
                <Row label="Running" value={status.deployment?.running ? `yes (pid ${status.deployment.pid})` : "no"} />
                <Row label="Requested" value={status.deployment?.requestedRevision != null ? `r${status.deployment.requestedRevision}` : "—"} />
                <Row label="Result" value={deploymentReport?.status ?? "—"} />
                <Row label="Release" value={release(deploymentReport?.remote)} />
                {deploymentReport?.error ? <ErrorText>{deploymentReport.error}</ErrorText> : null}
            </Panel>
        </div>
    );
}

function Panel({ title, children }) {
    return (
        <section style={{ border: "1px solid currentColor", borderRadius: "6px", padding: "10px", marginBottom: "10px" }}>
            <h3 style={{ margin: "0 0 8px 0" }}>{title}</h3>
            {children}
        </section>
    );
}

function Row({ label, value }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "8px", marginBottom: "4px" }}>
            <strong>{label}</strong><span>{value ?? "—"}</span>
        </div>
    );
}

function ErrorText({ children }) {
    return <p style={{ fontWeight: "bold" }}>ERROR: {children}</p>;
}

function approvalMessage(status) {
    if (status.phase === "current") return "Deployment is current.";
    if (status.phase === "checking") return "Checking for updates…";
    if (status.phase === "deploying") return "Approved deployment is running.";
    if (status.phase === "dismissed") return `Revision r${status.dismissedRevision} was declined. It may be presented again after the next poll.`;
    if (status.phase === "stale-remote") return "Remote revision is older than the committed local revision; no install is offered.";
    if (status.phase === "error") return "Watcher could not verify the remote release.";
    return "No update approval is currently available.";
}

function summarizeReport(report) {
    if (!report) return null;
    return {
        status: report.status ?? null,
        success: report.success ?? null,
        clean: report.clean ?? null,
        remote: report.remote ?? null,
        error: report.error ?? null,
        finishedAt: report.finishedAt ?? null,
    };
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

function release(value) {
    return value?.version && Number.isSafeInteger(value?.revision)
        ? `${value.version}-r${value.revision}`
        : "—";
}

function formatTime(value) {
    if (!Number.isFinite(value)) return "—";
    return new Date(value).toLocaleTimeString();
}

function formatAge(value) {
    if (!Number.isFinite(value)) return "unknown";
    if (value < 1_000) return `${value}ms`;
    if (value < 60_000) return `${Math.floor(value / 1_000)}s`;
    return `${Math.floor(value / 60_000)}m`;
}
