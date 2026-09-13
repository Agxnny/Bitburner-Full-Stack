/**
 * Refreshes git-pull.js only after the currently running puller exits.
 * This script is intentionally standalone and minimal.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const SELF_SOURCE = "src/bootstrap/git-pull.js";
const SELF_TARGET = "src/bootstrap/git-pull.js";
const STATE_PATH = "data/deployment-state.txt";
const PENDING_STATE_PATH = "data/deployment-pending.txt";
const REPORT_PATH = "data/git-pull-report.json";

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
    const url = `${RAW_BASE}/${SELF_SOURCE}?cb=${encodeURIComponent(`r${revision}-${nonce}-${Date.now()}`)}`;
    const ok = await ns.wget(url, SELF_TARGET, "home");
    if (!ok) return fail(ns, report, "git-pull self-refresh failed; deployment state was not advanced.");

    report.status = "committed";
    report.clean = true;
    report.success = true;
    report.finishedAt = Date.now();

    const committed = {
        schemaVersion: 1,
        version: pending.version,
        revision: pending.revision,
        manifest: pending.manifest,
        previousVersion: pending.previousVersion,
        previousRevision: pending.previousRevision,
        deployedAt: report.finishedAt,
    };

    ns.write(STATE_PATH, JSON.stringify(committed, null, 2), "w");
    ns.write(REPORT_PATH, JSON.stringify(report, null, 2), "w");
    if (ns.fileExists(PENDING_STATE_PATH, "home")) ns.rm(PENDING_STATE_PATH, "home");

    printSummary(ns, report);
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
        local: {
            version: pending.previousVersion ?? null,
            revision: pending.previousRevision ?? null,
        },
        remote: {
            version: pending.version ?? null,
            revision: pending.revision ?? null,
        },
        options: { force: false, allowDowngrade: false, expectedRevision: -1, dryRun: false },
        counts: { unchanged: 0, refreshed: 0, updated: 2, added: 0 },
        files: [],
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
    ns.tprint(`CLEAN | ${release(report.remote)} | unchanged ${c.unchanged} | refreshed ${c.refreshed} | updated ${c.updated} | added ${c.added}`);
}

function release(value) {
    return value?.version && Number.isSafeInteger(Number(value?.revision))
        ? `${value.version}-r${value.revision}`
        : "unknown release";
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}
