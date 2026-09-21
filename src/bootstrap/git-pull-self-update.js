/**
 * Refreshes git-pull.js only after the running puller exits, commits deployment
 * state, then reconciles persistent runtime units declared by the manifest.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BRANCH_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const SELF_TARGET = "src/bootstrap/git-pull.js";
const STATE_PATH = "data/deployment-state.txt";
const PENDING_STATE_PATH = "data/deployment-pending.txt";
const REPORT_PATH = "data/git-pull-report.json";
const TRANSITION_REVISION = 12;
const TRANSITION_SOURCE_PREFIX = "deployment/releases/r12-src/";

/** @param {NS} ns */
export async function main(ns) {
    const flags = ns.flags([
        ["wait-pid", 0],
        ["revision", -1],
        ["nonce", ""],
    ]);

    const waitPid = Number(flags["wait-pid"]);
    const revision = Number(flags.revision);
    const nonce = String(flags.nonce || Date.now());

    if (ns.getHostname() !== "home") return fail(ns, null, "Self-update helper must run on home.");
    if (!Number.isSafeInteger(waitPid) || waitPid <= 0) return fail(ns, null, "Invalid --wait-pid.");
    if (!Number.isSafeInteger(revision) || revision < 0) return fail(ns, null, "Invalid --revision.");

    while (ns.isRunning(waitPid, "home")) await ns.sleep(100);

    const pending = readJson(ns, PENDING_STATE_PATH);
    if (!pending || pending.revision !== revision) {
        return fail(ns, pending?.report ?? null, "Pending deployment state is missing or mismatched.");
    }

    const report = pending.report ?? legacyReport(pending);
    let selfLocation;
    try { selfLocation = resolveSelfLocation(pending); }
    catch (error) { return fail(ns, report, String(error?.message ?? error)); }

    const url = `${selfLocation.base}/${selfLocation.source}?cb=${encodeURIComponent(`r${revision}-${nonce}-${Date.now()}`)}`;
    const ok = await ns.wget(url, SELF_TARGET, "home");
    if (!ok) return fail(ns, report, "git-pull self-refresh failed; deployment state was not advanced.");

    const committedAt = Date.now();
    const runtimePlan = Array.isArray(pending.runtimePlan) ? pending.runtimePlan : [];
    const activeUnits = runtimePlan.filter((unit) => !unit.retired);
    const committed = {
        schemaVersion: 1,
        version: pending.version,
        revision: pending.revision,
        manifest: pending.manifest,
        releaseRef: pending.releaseRef ?? null,
        previousVersion: pending.previousVersion,
        previousRevision: pending.previousRevision,
        runtimeUnits: activeUnits.map(persistedUnit),
        managedFiles: Array.isArray(pending.managedFiles) ? [...pending.managedFiles] : [],
        deployedAt: committedAt,
    };

    ns.write(STATE_PATH, JSON.stringify(committed, null, 2), "w");
    if (ns.fileExists(PENDING_STATE_PATH, "home")) ns.rm(PENDING_STATE_PATH, "home");

    report.status = runtimePlan.length > 0 ? "reconciling-runtime" : "committed";
    report.runtime = report.runtime ?? { planned: [], status: "none", units: [] };
    report.runtime.status = runtimePlan.length > 0 ? "reconciling" : "not-required";
    report.runtime.units = [];
    report.clean = runtimePlan.length > 0 ? null : true;
    report.success = runtimePlan.length > 0 ? null : true;
    report.finishedAt = runtimePlan.length > 0 ? null : committedAt;
    ns.write(REPORT_PATH, JSON.stringify(report, null, 2), "w");

    const runtimeResults = await reconcileRuntime(ns, runtimePlan);
    report.runtime.units = runtimeResults;
    const retirementResults = await retireFiles(ns, Array.isArray(pending.retireFiles) ? pending.retireFiles : []);
    report.retirement = {
        planned: (pending.retireFiles ?? []).map((item) => ({ path: item.path })),
        status: retirementResults.some((item) => item.status === "failed") ? "degraded" : (retirementResults.length ? "complete" : "none"),
        files: retirementResults,
    };
    const runtimeFailed = report.runtime.units.some((item) => item.outcome === "failed");
    const retirementFailed = retirementResults.some((item) => item.status === "failed");
    const deploymentDegraded = runtimeFailed || retirementFailed;
    report.runtime.status = runtimeFailed ? "degraded" : "healthy";
    report.status = deploymentDegraded ? "committed-runtime-degraded" : "committed";
    report.clean = !deploymentDegraded;
    report.success = !deploymentDegraded;
    const errors = [
        ...report.runtime.units.filter((item) => item.outcome === "failed").map((item) => `${item.id}: ${item.error}`),
        ...retirementResults.filter((item) => item.status === "failed").map((item) => `retire ${item.path}: ${item.error}`),
    ];
    report.error = errors.length ? errors.join("; ") : null;
    report.finishedAt = Date.now();
    ns.write(REPORT_PATH, JSON.stringify(report, null, 2), "w");

    if (deploymentDegraded) {
        ns.tprint(`FAIL | ${release(report.remote)} | deployment committed but runtime/file retirement reconciliation degraded`);
        return;
    }
    printSummary(ns, report);
}

function resolveSelfLocation(pending) {
    const releaseRef = pending.releaseRef;
    const source = typeof pending.selfSource === "string" && pending.selfSource ? pending.selfSource : selfSourceFromReport(pending.report);

    if (/^[0-9a-f]{40}$/i.test(releaseRef ?? "")) {
        if (!source) throw new Error("Pinned deployment is missing the puller source path.");
        return { base: `https://raw.githubusercontent.com/${REPOSITORY}/${releaseRef}`, source };
    }

    if (pending.revision === TRANSITION_REVISION && source?.startsWith(TRANSITION_SOURCE_PREFIX)) {
        return { base: RAW_BRANCH_BASE, source };
    }

    throw new Error("Deployment is missing an immutable releaseRef; refusing unpinned puller self-refresh.");
}

function selfSourceFromReport(report) {
    return report?.files?.find((file) => file.target === SELF_TARGET)?.source ?? null;
}

async function reconcileRuntime(ns, runtimePlan) {
    const ordered = [...runtimePlan]
        .filter((unit) => unit.lifecycle === "persistent")
        .sort((a, b) => a.restartOrder - b.restartOrder || a.id.localeCompare(b.id));
    const results = [];

    for (const unit of ordered) {
        const matches = matchingProcesses(ns, unit);

        if (unit.retired) {
            if (matches.length === 0) {
                results.push(result(unit, "already-stopped", null, null));
                continue;
            }
            if (!stopProcesses(ns, matches)) {
                results.push(result(unit, "failed", null, "Could not stop the retired persistent process."));
                continue;
            }
            await ns.sleep(100);
            if (matchingProcesses(ns, unit).length > 0) {
                results.push(result(unit, "failed", null, "Retired persistent process remained active after stop request."));
                continue;
            }
            results.push(result(unit, "retired", null, null));
            continue;
        }

        if (!unit.changed && matches.length > 0) {
            results.push(result(unit, "kept-running", matches[0].pid, null));
            continue;
        }

        if (unit.changed && matches.length > 0) {
            if (!stopProcesses(ns, matches)) {
                results.push(result(unit, "failed", null, "Could not stop the previous persistent process."));
                continue;
            }
            await ns.sleep(100);
            if (matchingProcesses(ns, unit).length > 0) {
                results.push(result(unit, "failed", null, "Previous persistent process remained active after stop request."));
                continue;
            }
        }

        const pid = ns.run(unit.script, unit.threads, ...unit.args);
        if (pid === 0) {
            results.push(result(unit, "failed", null, "Could not launch persistent runtime unit."));
            continue;
        }
        results.push(result(unit, unit.changed ? "restarted" : "relaunched", pid, null));
    }

    return results;
}

async function retireFiles(ns, entries) {
    const results = [];
    for (const entry of entries) {
        const path = entry.path;
        const item = { path, existedBefore: ns.fileExists(path, "home"), matchedPids: [], stoppedPids: [], status: "pending", error: null, handledAt: Date.now() };
        if (!item.existedBefore) {
            item.status = "already-absent";
            ns.tprint(`RETIRE | ALREADY ABSENT | ${path}`);
            results.push(item);
            continue;
        }
        const matches = ns.ps("home").filter((process) => process.filename === path);
        item.matchedPids = matches.map((process) => process.pid);
        let stopOk = true;
        for (const process of matches) {
            ns.ui.closeTail(process.pid);
            if (ns.kill(process.pid)) {
                item.stoppedPids.push(process.pid);
                ns.tprint(`RETIRE | STOPPED pid ${process.pid} | ${path}`);
            } else stopOk = false;
        }
        if (matches.length === 0) ns.tprint(`RETIRE | NO PROCESS | ${path}`);
        if (matches.length > 0) await ns.sleep(150);
        const remaining = ns.ps("home").filter((process) => process.filename === path);
        if (!stopOk || remaining.length > 0) {
            item.status = "failed";
            item.error = remaining.length ? `Process still running: ${remaining.map((p) => p.pid).join(", ")}. File preserved.` : "One or more stop requests failed. File preserved.";
            ns.tprint(`RETIRE | BLOCKED | ${path} | ${item.error}`);
            results.push(item);
            continue;
        }
        ns.tprint(`RETIRE | VERIFIED STOPPED | ${path}`);
        const removed = ns.rm(path, "home");
        if (!removed || ns.fileExists(path, "home")) {
            item.status = "failed";
            item.error = "File deletion failed or file remained present.";
            ns.tprint(`RETIRE | DELETE FAILED | ${path}`);
            results.push(item);
            continue;
        }
        item.status = "retired";
        ns.tprint(`RETIRE | DELETED | ${path}`);
        ns.tprint(`RETIRE | VERIFIED ABSENT | ${path}`);
        results.push(item);
    }
    const retired = results.filter((x) => x.status === "retired").length;
    const absent = results.filter((x) => x.status === "already-absent").length;
    const failed = results.filter((x) => x.status === "failed").length;
    if (results.length) ns.tprint(`RETIREMENT SUMMARY | requested ${results.length} | deleted ${retired} | already absent ${absent} | failed ${failed}`);
    return results;
}

function stopProcesses(ns, processes) {
    let success = true;
    for (const process of processes) {
        ns.ui.closeTail(process.pid);
        if (!ns.kill(process.pid)) success = false;
    }
    return success;
}

function matchingProcesses(ns, unit) {
    return ns.ps(unit.host).filter((process) => process.filename === unit.script && argsEqual(process.args ?? [], unit.args ?? []));
}

function argsEqual(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
}

function result(unit, outcome, pid, error) {
    return {
        id: unit.id,
        script: unit.script,
        changed: Boolean(unit.changed),
        retired: Boolean(unit.retired),
        outcome,
        pid,
        error,
        handledAt: Date.now(),
    };
}

function persistedUnit(unit) {
    return {
        id: unit.id,
        lifecycle: unit.lifecycle,
        script: unit.script,
        host: unit.host,
        threads: unit.threads,
        args: [...unit.args],
        files: [...unit.files],
        restartOrder: unit.restartOrder,
    };
}

function legacyReport(pending) {
    return {
        schemaVersion: 1,
        startedAt: pending.stagedAt ?? null,
        finishedAt: null,
        status: "awaiting-self-refresh",
        clean: null,
        success: null,
        alarm: { active: false, type: null, message: null },
        local: { version: pending.previousVersion ?? null, revision: pending.previousRevision ?? null },
        remote: { version: pending.version ?? null, revision: pending.revision ?? null },
        options: { force: false, allowDowngrade: false, expectedRevision: -1, dryRun: false },
        counts: { unchanged: 0, refreshed: 0, updated: 2, added: 0 },
        files: [],
        runtime: { planned: [], status: "none", units: [] },
        retirement: { planned: [], status: "none", files: [] },
        error: null,
        legacyTransition: true,
    };
}

function fail(ns, report, message) {
    const finalReport = report ?? {
        schemaVersion: 1,
        startedAt: null,
        finishedAt: null,
        status: "failed",
        clean: false,
        success: false,
        alarm: { active: false, type: null, message: null },
        local: { version: null, revision: null },
        remote: { version: null, revision: null },
        counts: { unchanged: 0, refreshed: 0, updated: 0, added: 0 },
        files: [],
        runtime: { planned: [], status: "none", units: [] },
        error: null,
    };
    finalReport.status = "failed";
    finalReport.clean = false;
    finalReport.success = false;
    finalReport.error = message;
    finalReport.finishedAt = Date.now();
    ns.write(REPORT_PATH, JSON.stringify(finalReport, null, 2), "w");
    ns.tprint(`FAIL | ${release(finalReport.remote)} | ${message}`);
}

function printSummary(ns, report) {
    const c = report.counts;
    const retired = report.retirement?.files?.filter((item) => item.status === "retired").length ?? 0;
    ns.tprint(`CLEAN | ${release(report.remote)} | unchanged ${c.unchanged} | refreshed ${c.refreshed} | updated ${c.updated} | added ${c.added} | retired ${retired}`);
}

function release(value) {
    return value?.version && Number.isSafeInteger(Number(value?.revision)) ? `${value.version}-r${value.revision}` : "unknown release";
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}
