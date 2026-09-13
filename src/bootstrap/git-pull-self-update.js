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

    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR: git-pull self-update helper must run on home.");
        return;
    }
    if (!Number.isSafeInteger(waitPid) || waitPid <= 0) {
        ns.tprint("ERROR: self-update helper requires a valid --wait-pid.");
        return;
    }
    if (!Number.isSafeInteger(revision) || revision < 0) {
        ns.tprint("ERROR: self-update helper requires a valid --revision.");
        return;
    }

    while (ns.isRunning(waitPid, "home")) {
        await ns.sleep(100);
    }

    const url = `${RAW_BASE}/${SELF_SOURCE}?cb=${encodeURIComponent(`r${revision}-${nonce}-${Date.now()}`)}`;
    const ok = await ns.wget(url, SELF_TARGET, "home");

    if (!ok) {
        ns.tprint("ERROR: git-pull self-update failed; deployment state was not advanced.");
        return;
    }

    const pending = readJson(ns, PENDING_STATE_PATH);
    if (!pending || pending.revision !== revision) {
        ns.tprint("ERROR: pending deployment state is missing or does not match the refreshed revision.");
        return;
    }

    const committed = {
        schemaVersion: 1,
        version: pending.version,
        revision: pending.revision,
        manifest: pending.manifest,
        previousVersion: pending.previousVersion,
        previousRevision: pending.previousRevision,
        deployedAt: Date.now(),
    };

    ns.write(STATE_PATH, JSON.stringify(committed, null, 2), "w");
    if (ns.fileExists(PENDING_STATE_PATH, "home")) ns.rm(PENDING_STATE_PATH, "home");

    ns.tprint(`git-pull: deployment committed at ${committed.version}-r${committed.revision}.`);
}

function readJson(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try {
        return JSON.parse(ns.read(path));
    } catch {
        return null;
    }
}
