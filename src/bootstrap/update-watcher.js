/**
 * Persistent update watcher for Bitburner Full Stack.
 * Detects releases and owns approval command handling, but never auto-installs.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const VERSION_PATH = "deployment/version.json";
const LOCAL_STATE_PATH = "data/deployment-state.txt";
const STATUS_PATH = "data/update-status.json";
const COMMAND_PATH = "data/update-command.json";
const REPORT_PATH = "data/git-pull-report.json";
const TEMP_PATH = "data/update-watch-version.txt";
const PULLER_PATH = "src/bootstrap/git-pull.js";
const POLL_MS = 30_000;
const HEARTBEAT_MS = 5_000;
const LOOP_MS = 1_000;

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | update-watcher must run on home");
        return;
    }

    ns.disableLog("sleep");
    ns.disableLog("wget");
    ns.disableLog("rm");
    ns.disableLog("run");
    ns.disableLog("ps");

    let status = initialStatus(ns);
    let nextCheckAt = 0;
    let nextHeartbeatAt = 0;

    while (true) {
        const now = Date.now();

        if (ns.fileExists(COMMAND_PATH, "home")) {
            status = await processCommand(ns, status);
            writeStatus(ns, status);
        }

        if (now >= nextCheckAt) {
            status = await checkRemote(ns, status);
            nextCheckAt = Date.now() + POLL_MS;
            status.nextCheckAt = nextCheckAt;
            writeStatus(ns, status);
        }

        if (now >= nextHeartbeatAt) {
            status.heartbeatAt = Date.now();
            status.watcherPid = ns.pid;
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
        watcherPid: ns.pid,
        health: "starting",
        phase: "checking",
        heartbeatAt: Date.now(),
        lastCheckAt: null,
        nextCheckAt: null,
        pollIntervalMs: POLL_MS,
        local: releaseOf(local),
        remote: { version: null, revision: null, releasedAt: null },
        updateAvailable: false,
        presentedRevision: null,
        dismissedRevision: null,
        lastCommand: null,
        deployment: readDeploymentObservation(ns, null),
        error: null,
    };
}

async function checkRemote(ns, status) {
    const checkedAt = Date.now();
    const localState = readJson(ns, LOCAL_STATE_PATH);
    status.phase = "checking";
    status.local = releaseOf(localState);
    status.error = null;
    writeStatus(ns, status);

    try {
        const descriptor = await fetchDescriptor(ns, checkedAt);
        validateDescriptor(descriptor);

        const localRevision = Number(localState?.revision ?? -1);
        const remoteRevision = descriptor.revision;
        status.remote = {
            version: descriptor.version,
            revision: descriptor.revision,
            releasedAt: descriptor.releasedAt ?? null,
        };
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
        if (ns.fileExists(TEMP_PATH, "home")) ns.rm(TEMP_PATH, "home");
    }

    return status;
}

async function processCommand(ns, status) {
    const command = readJson(ns, COMMAND_PATH);
    if (ns.fileExists(COMMAND_PATH, "home")) ns.rm(COMMAND_PATH, "home");

    if (!validCommand(command)) {
        return recordCommand(status, command, "rejected", "Invalid update command schema.");
    }

    if (status.lastCommand?.id === command.id) {
        return recordCommand(status, command, "ignored", "Duplicate command id.");
    }

    if (command.action === "decline") {
        if (command.revision !== status.presentedRevision) {
            return recordCommand(status, command, "rejected", "Decline revision does not match the presented revision.");
        }
        status.dismissedRevision = command.revision;
        status.presentedRevision = null;
        status.phase = "dismissed";
        return recordCommand(status, command, "accepted", null);
    }

    status = await checkRemote(ns, status);
    const localRevision = Number(status.local.revision ?? -1);
    const remoteRevision = Number(status.remote.revision ?? -1);

    if (status.health !== "healthy") {
        return recordCommand(status, command, "rejected", "Remote release could not be verified.");
    }
    if (command.revision !== remoteRevision || remoteRevision <= localRevision) {
        return recordCommand(status, command, "rejected", "Approved revision is no longer the current newer release.");
    }
    if (pullerRunning(ns)) {
        return recordCommand(status, command, "rejected", "A deployment is already running.");
    }

    const pid = ns.run(PULLER_PATH, 1, "--expect-revision", command.revision);
    if (pid === 0) {
        return recordCommand(status, command, "failed", "Could not start deployment puller.");
    }

    status.phase = "deploying";
    status.deployment = {
        pid,
        requestedRevision: command.revision,
        startedAt: Date.now(),
        running: true,
        report: summarizeReport(readJson(ns, REPORT_PATH)),
    };
    return recordCommand(status, command, "accepted", null);
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
    const report = summarizeReport(readJson(ns, REPORT_PATH));
    if (!previous?.pid) return { pid: null, requestedRevision: null, startedAt: null, running: false, report };

    const running = ns.isRunning(previous.pid, "home");
    return { ...previous, running, report };
}

function pullerRunning(ns) {
    return ns.ps("home").some((process) => process.filename === PULLER_PATH);
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

async function fetchDescriptor(ns, nonce) {
    const url = `${RAW_BASE}/${VERSION_PATH}?cb=${encodeURIComponent(`${nonce}-${ns.pid}`)}`;
    const ok = await ns.wget(url, TEMP_PATH, "home");
    if (!ok) throw new Error("Failed to fetch deployment version descriptor.");
    const text = ns.read(TEMP_PATH);
    if (!text) throw new Error("Deployment version descriptor was empty.");
    try { return JSON.parse(text); } catch { throw new Error("Deployment version descriptor contained invalid JSON."); }
}

function validateDescriptor(value) {
    if (!value || value.schemaVersion !== 1) throw new Error("Unsupported version descriptor schema.");
    if (!/^v\d+\.\d+\.\d+$/.test(value.version)) throw new Error("Invalid remote semantic version.");
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid remote revision.");
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

function releaseOf(state) {
    return {
        version: state?.version ?? null,
        revision: Number.isSafeInteger(state?.revision) ? state.revision : null,
    };
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

function writeStatus(ns, status) {
    ns.write(STATUS_PATH, JSON.stringify(status, null, 2), "w");
}
