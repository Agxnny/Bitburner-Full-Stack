/**
 * Persistent update watcher for Bitburner Full Stack.
 * Detects releases, owns approval handling, and owns the update dashboard child.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const API_VERSION_URL = `https://api.github.com/repos/${REPOSITORY}/contents/deployment/version.json?ref=${BRANCH}`;
const VERSION_PATH = "deployment/version.json";
const LOCAL_STATE_PATH = "data/deployment-state.txt";
const STATUS_PATH = "data/update-status.json";
const COMMAND_PATH = "data/update-command.json";
const REPORT_PATH = "data/git-pull-report.json";
const TEMP_RAW_PATH = "data/update-watch-version-raw.txt";
const TEMP_API_PATH = "data/update-watch-version-api.txt";
const PULLER_PATH = "src/bootstrap/git-pull.js";
const HELPER_PATH = "src/bootstrap/git-pull-self-update.js";
const DASHBOARD_PATH = "src/ui/update-dashboard.jsx";
const POLL_MS = 30_000;
const API_POLL_MS = 75_000;
const HEARTBEAT_MS = 5_000;
const LOOP_MS = 1_000;
const DASHBOARD_RESTART_COOLDOWN_MS = 5_000;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | update-watcher must run on home");
        return;
    }

    const watcherProcesses = ns.ps("home")
        .filter((process) => process.filename === "src/bootstrap/update-watcher.js")
        .sort((a, b) => a.pid - b.pid);
    if (watcherProcesses.length > 0 && watcherProcesses[0].pid !== ns.pid) {
        ns.tprint(`ERROR | update-watcher already running as pid ${watcherProcesses[0].pid}`);
        return;
    }

    ns.disableLog("sleep");
    ns.disableLog("wget");
    ns.disableLog("rm");
    ns.disableLog("run");
    ns.disableLog("ps");
    ns.disableLog("kill");

    let status = initialStatus(ns);
    status.dashboard = restartDashboardForOwnership(ns, status.dashboard);
    writeStatus(ns, status);

    let nextCheckAt = 0;
    let nextHeartbeatAt = 0;

    while (true) {
        const now = Date.now();

        if (ns.fileExists(COMMAND_PATH, "home")) {
            status = await processCommand(ns, status);
            writeStatus(ns, status);
        }

        if (now >= nextCheckAt) {
            status = await checkRemote(ns, status, false);
            nextCheckAt = Date.now() + POLL_MS;
            status.nextCheckAt = nextCheckAt;
            writeStatus(ns, status);
        }

        if (now >= nextHeartbeatAt) {
            status.heartbeatAt = Date.now();
            status.watcherPid = ns.pid;
            status.local = releaseOf(readJson(ns, LOCAL_STATE_PATH));
            status.dashboard = ensureDashboard(ns, status.dashboard);
            status.deployment = readDeploymentObservation(ns, status.deployment);
            writeStatus(ns, status);
            nextHeartbeatAt = Date.now() + HEARTBEAT_MS;
        }

        await ns.sleep(LOOP_MS);
    }
}

function initialStatus(ns) {
    const local = readJson(ns, LOCAL_STATE_PATH);
    return {
        schemaVersion: 1,
        service: "update-watcher",
        lifecycle: "persistent",
        watcherPid: ns.pid,
        health: "starting",
        phase: "checking",
        heartbeatAt: Date.now(),
        lastCheckAt: null,
        nextCheckAt: null,
        pollIntervalMs: POLL_MS,
        local: releaseOf(local),
        remote: emptyRelease(),
        discovery: {
            selectedSource: null,
            selectedAt: null,
            raw: discoverySource(),
            api: { ...discoverySource(), intervalMs: API_POLL_MS },
        },
        updateAvailable: false,
        presentedRevision: null,
        dismissedRevision: null,
        lastCommand: null,
        dashboard: {
            pid: null,
            running: false,
            restartCount: 0,
            lastStartedAt: null,
            lastCheckedAt: null,
            error: null,
        },
        deployment: readDeploymentObservation(ns, null),
        error: null,
    };
}

async function checkRemote(ns, status, forceApi) {
    const checkedAt = Date.now();
    const localState = readJson(ns, LOCAL_STATE_PATH);
    status.phase = "checking";
    status.local = releaseOf(localState);
    status.error = null;
    writeStatus(ns, status);

    const raw = await fetchSource(ns, "raw", checkedAt);
    status.discovery.raw = mergeDiscovery(status.discovery.raw, raw, checkedAt);

    const apiDue = forceApi
        || !Number.isFinite(status.discovery.api.lastAttemptAt)
        || checkedAt - status.discovery.api.lastAttemptAt >= API_POLL_MS;
    if (apiDue) {
        const api = await fetchSource(ns, "api", checkedAt);
        status.discovery.api = { ...mergeDiscovery(status.discovery.api, api, checkedAt), intervalMs: API_POLL_MS };
    }

    try {
        const selected = chooseNewest(status.discovery.raw.descriptor, status.discovery.api.descriptor);
        if (!selected) throw new Error("No valid release descriptor is currently available from either discovery source.");
        validateDescriptor(selected.descriptor);

        const localRevision = Number(localState?.revision ?? -1);
        const remoteRevision = selected.descriptor.revision;
        status.remote = releaseOf(selected.descriptor);
        status.discovery.selectedSource = selected.source;
        status.discovery.selectedAt = checkedAt;
        status.lastCheckAt = checkedAt;
        status.health = "healthy";
        status.updateAvailable = remoteRevision > localRevision;
        status.presentedRevision = status.updateAvailable ? remoteRevision : null;
        status.dismissedRevision = null;

        if (remoteRevision > localRevision) status.phase = "update-available";
        else if (remoteRevision === localRevision) status.phase = "current";
        else status.phase = "stale-remote";
    } catch (error) {
        status.health = "degraded";
        status.phase = "error";
        status.lastCheckAt = checkedAt;
        status.error = String(error?.message ?? error);
    } finally {
        cleanupTemps(ns);
    }

    return status;
}

async function fetchSource(ns, source, attemptedAt) {
    try {
        const descriptor = source === "api" ? await fetchApiDescriptor(ns) : await fetchRawDescriptor(ns, attemptedAt);
        validateDescriptor(descriptor);
        return { descriptor, error: null };
    } catch (error) {
        return { descriptor: null, error: String(error?.message ?? error) };
    }
}

function mergeDiscovery(previous, result, attemptedAt) {
    if (result.descriptor) {
        return {
            ...previous,
            lastAttemptAt: attemptedAt,
            lastSuccessAt: attemptedAt,
            descriptor: result.descriptor,
            revision: result.descriptor.revision,
            error: null,
        };
    }
    return { ...previous, lastAttemptAt: attemptedAt, error: result.error };
}

function chooseNewest(raw, api) {
    if (!raw && !api) return null;
    if (!raw) return { source: "github-api", descriptor: api };
    if (!api) return { source: "github-raw", descriptor: raw };
    if (raw.revision === api.revision) {
        if (raw.version !== api.version || raw.manifest !== api.manifest || raw.releaseRef !== api.releaseRef) {
            throw new Error(`Discovery sources disagree for r${raw.revision}.`);
        }
        return { source: "github-api+raw", descriptor: api };
    }
    return raw.revision > api.revision
        ? { source: "github-raw", descriptor: raw }
        : { source: "github-api", descriptor: api };
}

async function processCommand(ns, status) {
    const command = readJson(ns, COMMAND_PATH);
    if (ns.fileExists(COMMAND_PATH, "home")) ns.rm(COMMAND_PATH, "home");

    if (!validCommand(command)) return recordCommand(status, command, "rejected", "Invalid update command schema.");
    if (status.lastCommand?.id === command.id) return recordCommand(status, command, "ignored", "Duplicate command id.");

    if (command.action === "decline") {
        if (command.revision !== status.presentedRevision) {
            return recordCommand(status, command, "rejected", "Decline revision does not match the presented revision.");
        }
        status.dismissedRevision = command.revision;
        status.presentedRevision = null;
        status.phase = "dismissed";
        return recordCommand(status, command, "accepted", null);
    }

    status = await checkRemote(ns, status, true);
    const localRevision = Number(status.local.revision ?? -1);
    const remoteRevision = Number(status.remote.revision ?? -1);

    if (status.health !== "healthy") return recordCommand(status, command, "rejected", "Remote release could not be verified.");
    if (command.revision !== remoteRevision || remoteRevision <= localRevision) {
        return recordCommand(status, command, "rejected", "Approved revision is no longer the current newer release.");
    }
    if (deploymentInfrastructureRunning(ns)) return recordCommand(status, command, "rejected", "A deployment is already running or finalizing.");

    const pid = ns.run(PULLER_PATH, 1, "--expect-revision", command.revision);
    if (pid === 0) return recordCommand(status, command, "failed", "Could not start deployment puller.");

    status.phase = "deploying";
    status.deployment = {
        phase: "puller",
        pullerPid: pid,
        helperPid: null,
        requestedRevision: command.revision,
        startedAt: Date.now(),
        running: true,
        report: summarizeReport(readJson(ns, REPORT_PATH)),
    };
    return recordCommand(status, command, "accepted", null);
}

function restartDashboardForOwnership(ns, previous) {
    for (const process of dashboardProcesses(ns)) {
        ns.ui.closeTail(process.pid);
        ns.kill(process.pid);
    }
    const pid = ns.run(DASHBOARD_PATH, 1);
    return {
        pid: pid || null,
        running: pid > 0,
        restartCount: (previous?.restartCount ?? 0) + (pid > 0 ? 1 : 0),
        lastStartedAt: pid > 0 ? Date.now() : previous?.lastStartedAt ?? null,
        lastCheckedAt: Date.now(),
        error: pid > 0 ? null : "Could not launch update dashboard.",
    };
}

function ensureDashboard(ns, previous) {
    const processes = dashboardProcesses(ns);
    if (processes.length > 0) {
        const process = processes.sort((a, b) => a.pid - b.pid)[0];
        return { ...previous, pid: process.pid, running: true, lastCheckedAt: Date.now(), error: null };
    }

    const now = Date.now();
    if (previous?.lastStartedAt && now - previous.lastStartedAt < DASHBOARD_RESTART_COOLDOWN_MS) {
        return { ...previous, pid: null, running: false, lastCheckedAt: now };
    }

    const pid = ns.run(DASHBOARD_PATH, 1);
    return {
        ...previous,
        pid: pid || null,
        running: pid > 0,
        restartCount: (previous?.restartCount ?? 0) + (pid > 0 ? 1 : 0),
        lastStartedAt: pid > 0 ? now : previous?.lastStartedAt ?? null,
        lastCheckedAt: now,
        error: pid > 0 ? null : "Could not relaunch update dashboard.",
    };
}

function dashboardProcesses(ns) {
    return ns.ps("home").filter((process) => process.filename === DASHBOARD_PATH);
}

function recordCommand(status, command, outcome, error) {
    status.lastCommand = {
        id: command?.id ?? null,
        action: command?.action ?? null,
        revision: Number.isSafeInteger(command?.revision) ? command.revision : null,
        createdAt: command?.createdAt ?? null,
        handledAt: Date.now(),
        outcome,
        error,
    };
    if (error) status.error = error;
    return status;
}

function readDeploymentObservation(ns, previous) {
    const processes = ns.ps("home");
    const puller = processes.find((process) => process.filename === PULLER_PATH) ?? null;
    const helper = processes.find((process) => process.filename === HELPER_PATH) ?? null;
    const report = summarizeReport(readJson(ns, REPORT_PATH));
    let phase = "idle";
    if (puller) phase = "puller";
    else if (helper) phase = "self-refresh";
    else if (report?.status === "reconciling-runtime") phase = "runtime-reconcile";
    else if (report?.status === "committed-runtime-degraded") phase = "degraded";
    else if (report?.status === "committed") phase = "committed";
    else if (report?.status === "failed") phase = "failed";

    return {
        phase,
        pullerPid: puller?.pid ?? null,
        helperPid: helper?.pid ?? null,
        requestedRevision: previous?.requestedRevision ?? null,
        startedAt: previous?.startedAt ?? null,
        running: Boolean(puller || helper || report?.status === "reconciling-runtime"),
        report,
    };
}

function deploymentInfrastructureRunning(ns) {
    return ns.ps("home").some((process) => process.filename === PULLER_PATH || process.filename === HELPER_PATH);
}

function summarizeReport(report) {
    if (!report) return null;
    return {
        status: report.status ?? null,
        success: report.success ?? null,
        clean: report.clean ?? null,
        remote: report.remote ?? null,
        discovery: report.discovery ?? null,
        runtime: report.runtime ?? null,
        error: report.error ?? null,
        finishedAt: report.finishedAt ?? null,
    };
}

async function fetchRawDescriptor(ns, nonce) {
    const url = `${RAW_BASE}/${VERSION_PATH}?cb=${encodeURIComponent(`${nonce}-${ns.pid}`)}`;
    const ok = await ns.wget(url, TEMP_RAW_PATH, "home");
    if (!ok) throw new Error("Failed to fetch Raw deployment version descriptor.");
    const text = ns.read(TEMP_RAW_PATH);
    if (!text) throw new Error("Raw deployment version descriptor was empty.");
    try { return JSON.parse(text); } catch { throw new Error("Raw deployment version descriptor contained invalid JSON."); }
}

async function fetchApiDescriptor(ns) {
    const ok = await ns.wget(API_VERSION_URL, TEMP_API_PATH, "home");
    if (!ok) throw new Error("GitHub API descriptor request failed.");
    let outer;
    try { outer = JSON.parse(ns.read(TEMP_API_PATH)); } catch { throw new Error("GitHub API descriptor response contained invalid JSON."); }
    if (outer?.encoding !== "base64" || typeof outer?.content !== "string") throw new Error("GitHub API response did not contain base64 file content.");
    try { return JSON.parse(decodeBase64(outer.content)); } catch { throw new Error("GitHub API deployment descriptor content was invalid."); }
}

function decodeBase64(value) {
    return decodeURIComponent(escape(atob(value.replace(/\s/g, ""))));
}

function validateDescriptor(value) {
    if (!value || value.schemaVersion !== 1) throw new Error("Unsupported version descriptor schema.");
    if (!/^v\d+\.\d+\.\d+$/.test(value.version)) throw new Error("Invalid remote semantic version.");
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid remote revision.");
    if (typeof value.manifest !== "string" || !value.manifest) throw new Error("Missing remote manifest path.");
    if (!/^[0-9a-f]{40}$/i.test(value.releaseRef ?? "")) throw new Error("Missing or invalid immutable releaseRef.");
}

function validCommand(command) {
    return Boolean(
        command
        && command.schemaVersion === 1
        && typeof command.id === "string"
        && command.id.length > 0
        && (command.action === "approve" || command.action === "decline")
        && Number.isSafeInteger(command.revision)
        && command.revision >= 0
        && Number.isFinite(command.createdAt),
    );
}

function discoverySource() {
    return { lastAttemptAt: null, lastSuccessAt: null, revision: null, descriptor: null, error: null };
}

function emptyRelease() {
    return { version: null, revision: null, releasedAt: null, releaseRef: null };
}

function releaseOf(value) {
    return {
        version: value?.version ?? null,
        revision: Number.isSafeInteger(value?.revision) ? value.revision : null,
        releasedAt: value?.releasedAt ?? null,
        releaseRef: value?.releaseRef ?? null,
    };
}

function cleanupTemps(ns) {
    for (const path of [TEMP_RAW_PATH, TEMP_API_PATH]) if (ns.fileExists(path, "home")) ns.rm(path, "home");
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

function writeStatus(ns, status) {
    ns.write(STATUS_PATH, JSON.stringify(status, null, 2), "w");
}
