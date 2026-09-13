/**
 * Standalone bootstrap puller for Bitburner Full Stack.
 * Keep this file dependency-free so it can recover the rest of the project.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const VERSION_PATH = "deployment/version.json";
const VALIDATION_FAILURE_VERSION_PATH = "deployment/validation/failure-version.json";
const VALIDATION_FAILURE_FIXTURE = "staging-failure";
const STATE_PATH = "data/deployment-state.txt";
const PENDING_STATE_PATH = "data/deployment-pending.txt";
const REPORT_PATH = "data/git-pull-report.json";
const STAGE_ROOT = "data/update-stage";
const SELF_PATH = "src/bootstrap/git-pull.js";
const SELF_HELPER_PATH = "src/bootstrap/git-pull-self-update.js";

/** @param {NS} ns */
export async function main(ns) {
    const flags = ns.flags([
        ["force", false],
        ["allow-downgrade", false],
        ["expect-revision", -1],
        ["dry-run", false],
        ["validation-failure", false],
    ]);

    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR | git-pull must run on home");
        return;
    }

    const startedAt = Date.now();
    const nonce = `${startedAt}-${Math.floor(Math.random() * 1_000_000_000)}`;
    const localState = readJsonFile(ns, STATE_PATH);
    const stagedPaths = [];
    const validationFailure = Boolean(flags["validation-failure"]);
    const descriptorPath = validationFailure ? VALIDATION_FAILURE_VERSION_PATH : VERSION_PATH;
    let descriptor = null;
    let report = createReport(startedAt, localState, flags, descriptorPath);

    try {
        if (validationFailure) validateValidationOptions(flags);

        descriptor = await fetchJson(ns, descriptorPath, `${STAGE_ROOT}/version-${nonce}.txt`, nonce);
        validateDescriptor(descriptor);
        if (validationFailure) validateFailureFixture(descriptor);
        report.remote = { version: descriptor.version, revision: descriptor.revision };

        const expectedRevision = Number(flags["expect-revision"]);
        if (expectedRevision >= 0 && descriptor.revision !== expectedRevision) {
            throw new Error(`Approved r${expectedRevision} is no longer current; remote is r${descriptor.revision}.`);
        }

        const localRevision = Number(localState?.revision ?? -1);
        if (descriptor.revision < localRevision && !flags["allow-downgrade"]) {
            report.status = "blocked-stale";
            report.clean = false;
            report.success = false;
            report.alarm = {
                active: true,
                type: "STALE_REVISION",
                message: `Blocked stale revision r${descriptor.revision}; local is r${localRevision}.`,
            };
            finishReport(ns, report);
            ns.tprint(`ALARM | STALE REVISION | local ${formatRelease(localState)} | remote ${descriptor.version}-r${descriptor.revision} | pull blocked`);
            return;
        }

        const manifest = await fetchJson(
            ns,
            descriptor.manifest,
            `${STAGE_ROOT}/manifest-${descriptor.revision}-${nonce}.txt`,
            `r${descriptor.revision}-${nonce}`,
        );
        validateManifest(manifest, descriptor);

        const stagedFiles = [];
        const targets = new Set();

        for (let index = 0; index < manifest.files.length; index++) {
            const file = manifest.files[index];
            validateFileEntry(file);
            if (targets.has(file.target)) throw new Error(`Duplicate manifest target: ${file.target}`);
            targets.add(file.target);

            const stagePath = `${STAGE_ROOT}/r${descriptor.revision}-${index}-${nonce}.txt`;
            stagedPaths.push(stagePath);
            const url = cacheBust(`${RAW_BASE}/${file.source}`, `r${descriptor.revision}-${nonce}`);
            const ok = await ns.wget(url, stagePath, "home");
            if (!ok) throw new Error(`Download failed: ${file.source}`);

            const content = ns.read(stagePath);
            if (!content) throw new Error(`Downloaded file is empty: ${file.source}`);

            const existed = ns.fileExists(file.target, "home");
            const previous = existed ? ns.read(file.target) : null;
            const same = existed && previous === content;
            const deferredSelf = file.target === SELF_PATH;
            let action = existed ? (same ? "unchanged" : "updated") : "added";

            if (same && (flags.force || deferredSelf)) action = "refreshed";
            stagedFiles.push({ ...file, content, action, deferredSelf });
        }

        report.files = stagedFiles.map(({ source, target, action, deferredSelf }) => ({
            source, target, action, deferred: deferredSelf,
        }));
        report.counts = countActions(report.files);

        if (validationFailure) {
            throw new Error("Validation fixture unexpectedly staged successfully; activation blocked.");
        }

        if (flags["dry-run"]) {
            report.status = "dry-run";
            report.clean = true;
            report.success = true;
            finishReport(ns, report);
            printSummary(ns, report);
            return;
        }

        const selfEntry = stagedFiles.find((file) => file.target === SELF_PATH);
        const helperEntry = stagedFiles.find((file) => file.target === SELF_HELPER_PATH);
        if (!selfEntry) throw new Error(`Manifest must include ${SELF_PATH}.`);
        if (!helperEntry) throw new Error(`Manifest must include ${SELF_HELPER_PATH}.`);

        const sameRevision = descriptor.revision === Number(localState?.revision ?? -1);
        if (sameRevision && !flags.force) {
            report.status = "current";
            report.clean = true;
            report.success = true;
            report.files = report.files.map((file) =>
                file.target === SELF_PATH && file.action === "refreshed"
                    ? { ...file, action: "unchanged", deferred: false }
                    : file,
            );
            report.counts = countActions(report.files);
            finishReport(ns, report);
            printSummary(ns, report);
            return;
        }

        for (const file of stagedFiles) {
            if (file.target === SELF_PATH || file.action === "unchanged") continue;
            ns.write(file.target, file.content, "w");
        }

        report.status = "awaiting-self-refresh";
        report.clean = null;
        report.success = null;
        report.finishedAt = null;
        ns.write(REPORT_PATH, JSON.stringify(report, null, 2), "w");

        const pendingState = {
            schemaVersion: 1,
            version: descriptor.version,
            revision: descriptor.revision,
            manifest: descriptor.manifest,
            previousVersion: localState?.version ?? null,
            previousRevision: localState?.revision ?? null,
            report,
            stagedAt: Date.now(),
        };
        ns.write(PENDING_STATE_PATH, JSON.stringify(pendingState, null, 2), "w");

        cleanup(ns, stagedPaths);
        stagedPaths.length = 0;

        const helperPid = ns.run(
            SELF_HELPER_PATH,
            1,
            "--wait-pid", ns.pid,
            "--revision", descriptor.revision,
            "--nonce", nonce,
        );
        if (helperPid === 0) throw new Error("Could not start git-pull self-update helper.");
    } catch (error) {
        report.status = "failed";
        report.clean = false;
        report.success = false;
        report.error = String(error?.message ?? error);
        finishReport(ns, report);
        ns.tprint(`FAIL | ${descriptor ? `${descriptor.version}-r${descriptor.revision}` : "unknown release"} | ${report.error}`);
    } finally {
        cleanup(ns, stagedPaths);
    }
}

function createReport(startedAt, localState, flags, descriptorPath) {
    return {
        schemaVersion: 1,
        startedAt,
        finishedAt: null,
        status: "running",
        clean: null,
        success: null,
        alarm: { active: false, type: null, message: null },
        local: {
            version: localState?.version ?? null,
            revision: localState?.revision ?? null,
        },
        remote: { version: null, revision: null },
        options: {
            force: Boolean(flags.force),
            allowDowngrade: Boolean(flags["allow-downgrade"]),
            expectedRevision: Number(flags["expect-revision"]),
            dryRun: Boolean(flags["dry-run"]),
            validationFailure: Boolean(flags["validation-failure"]),
            descriptorPath,
        },
        counts: { unchanged: 0, refreshed: 0, updated: 0, added: 0 },
        files: [],
        error: null,
    };
}

function countActions(files) {
    const counts = { unchanged: 0, refreshed: 0, updated: 0, added: 0 };
    for (const file of files) if (Object.hasOwn(counts, file.action)) counts[file.action]++;
    return counts;
}

function finishReport(ns, report) {
    report.finishedAt = Date.now();
    ns.write(REPORT_PATH, JSON.stringify(report, null, 2), "w");
}

function printSummary(ns, report) {
    const c = report.counts;
    const result = report.clean && report.success ? "CLEAN" : "FAIL";
    ns.tprint(`${result} | ${report.remote.version}-r${report.remote.revision} | unchanged ${c.unchanged} | refreshed ${c.refreshed} | updated ${c.updated} | added ${c.added}`);
}

function formatRelease(state) {
    return state?.version && Number.isSafeInteger(Number(state?.revision))
        ? `${state.version}-r${state.revision}`
        : "unversioned";
}

function readJsonFile(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

async function fetchJson(ns, sourcePath, localPath, bustValue) {
    const ok = await ns.wget(cacheBust(`${RAW_BASE}/${sourcePath}`, bustValue), localPath, "home");
    if (!ok) throw new Error(`Download failed: ${sourcePath}`);
    const text = ns.read(localPath);
    ns.rm(localPath, "home");
    if (!text) throw new Error(`Downloaded metadata is empty: ${sourcePath}`);
    try { return JSON.parse(text); } catch { throw new Error(`Invalid JSON: ${sourcePath}`); }
}

function cacheBust(url, value) {
    return `${url}${url.includes("?") ? "&" : "?"}cb=${encodeURIComponent(value)}`;
}

function validateValidationOptions(flags) {
    if (flags.force || flags["allow-downgrade"] || Number(flags["expect-revision"]) >= 0 || flags["dry-run"]) {
        throw new Error("--validation-failure may not be combined with deployment override flags.");
    }
}

function validateFailureFixture(value) {
    if (value.validationFixture !== VALIDATION_FAILURE_FIXTURE) {
        throw new Error("Validation failure descriptor is missing its required fixture marker.");
    }
}

function validateDescriptor(value) {
    if (!value || value.schemaVersion !== 1) throw new Error("Unsupported version descriptor schema.");
    if (!/^v\d+\.\d+\.\d+$/.test(value.version)) throw new Error("Invalid semantic version.");
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid revision.");
    if (typeof value.manifest !== "string" || !value.manifest) throw new Error("Missing manifest path.");
}

function validateManifest(manifest, descriptor) {
    if (!manifest || manifest.schemaVersion !== 1) throw new Error("Unsupported manifest schema.");
    if (manifest.version !== descriptor.version || manifest.revision !== descriptor.revision) {
        throw new Error("Version descriptor and manifest disagree.");
    }
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error("Manifest contains no files.");
}

function validateFileEntry(file) {
    if (!file || typeof file.source !== "string" || typeof file.target !== "string") {
        throw new Error("Invalid manifest file entry.");
    }
    if (!file.source || !file.target || file.source.includes("..") || file.target.includes("..")) {
        throw new Error("Unsafe manifest path.");
    }
    if (file.target.startsWith("data/") || file.target.startsWith("/data/")) {
        throw new Error(`Manifest may not deploy protected runtime data: ${file.target}`);
    }
}

function cleanup(ns, paths) {
    for (const path of paths) if (ns.fileExists(path, "home")) ns.rm(path, "home");
}
