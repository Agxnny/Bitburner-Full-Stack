/**
 * Standalone bootstrap puller for Bitburner Full Stack.
 * Keep this file dependency-free so it can recover the rest of the project.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BRANCH_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const API_VERSION_URL = `https://api.github.com/repos/${REPOSITORY}/contents/deployment/version.json?ref=${BRANCH}`;
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

        if (validationFailure) {
            descriptor = await fetchJsonFromBase(ns, RAW_BRANCH_BASE, descriptorPath, `${STAGE_ROOT}/version-${nonce}.txt`, nonce);
            report.discovery = { selectedSource: "raw-fixture", raw: releaseOf(descriptor), api: null };
        } else {
            const discovery = await discoverDescriptor(ns, nonce);
            descriptor = discovery.descriptor;
            report.discovery = discovery.telemetry;
        }
        validateDescriptor(descriptor, !validationFailure);
        if (validationFailure) validateFailureFixture(descriptor);
        report.remote = releaseOf(descriptor);

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

        const releaseBase = validationFailure ? RAW_BRANCH_BASE : rawBaseForRef(descriptor.releaseRef);
        const manifest = await fetchJsonFromBase(
            ns,
            releaseBase,
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
            const ok = await ns.wget(cacheBust(`${releaseBase}/${file.source}`, `r${descriptor.revision}-${nonce}`), stagePath, "home");
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

        const runtimePlan = buildRuntimePlan(manifest, stagedFiles, targets, localState);
        report.files = stagedFiles.map(({ source, target, action, deferredSelf }) => ({ source, target, action, deferred: deferredSelf }));
        report.counts = countActions(report.files);
        report.runtime = { planned: runtimePlan.map(runtimeSummary), status: "planned", units: [] };

        if (validationFailure) throw new Error("Validation fixture unexpectedly staged successfully; activation blocked.");

        if (flags["dry-run"]) {
            report.status = "dry-run";
            report.clean = true;
            report.success = true;
            finishReport(ns, report);
            printSummary(ns, report);
            return;
        }

        if (!stagedFiles.some((file) => file.target === SELF_PATH)) throw new Error(`Manifest must include ${SELF_PATH}.`);
        if (!stagedFiles.some((file) => file.target === SELF_HELPER_PATH)) throw new Error(`Manifest must include ${SELF_HELPER_PATH}.`);

        const sameRevision = descriptor.revision === Number(localState?.revision ?? -1);
        if (sameRevision && !flags.force) {
            report.status = "current";
            report.clean = true;
            report.success = true;
            report.files = report.files.map((file) =>
                file.target === SELF_PATH && file.action === "refreshed" ? { ...file, action: "unchanged", deferred: false } : file,
            );
            report.counts = countActions(report.files);
            report.runtime.status = "not-required";
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

        const selfEntry = stagedFiles.find((file) => file.target === SELF_PATH);
        const pendingState = {
            schemaVersion: 1,
            version: descriptor.version,
            revision: descriptor.revision,
            manifest: descriptor.manifest,
            releaseRef: descriptor.releaseRef ?? null,
            selfSource: selfEntry?.source ?? SELF_PATH,
            previousVersion: localState?.version ?? null,
            previousRevision: localState?.revision ?? null,
            runtimePlan,
            report,
            stagedAt: Date.now(),
        };
        ns.write(PENDING_STATE_PATH, JSON.stringify(pendingState, null, 2), "w");

        cleanup(ns, stagedPaths);
        stagedPaths.length = 0;

        const helperPid = ns.run(SELF_HELPER_PATH, 1, "--wait-pid", ns.pid, "--revision", descriptor.revision, "--nonce", nonce);
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

async function discoverDescriptor(ns, nonce) {
    const raw = await tryFetchJson(ns, RAW_BRANCH_BASE, VERSION_PATH, `${STAGE_ROOT}/version-raw-${nonce}.txt`, `raw-${nonce}`);
    const api = await tryFetchApiDescriptor(ns, `${STAGE_ROOT}/version-api-${nonce}.txt`);
    if (!raw.value && !api.value) throw new Error(`Release discovery failed. Raw: ${raw.error}; API: ${api.error}`);
    if (raw.value) validateDescriptor(raw.value, true);
    if (api.value) validateDescriptor(api.value, true);
    const descriptor = chooseNewest(raw.value, api.value);
    return {
        descriptor,
        telemetry: {
            selectedSource: descriptor === api.value ? "github-api" : "github-raw",
            raw: { ...releaseOf(raw.value), error: raw.error },
            api: { ...releaseOf(api.value), error: api.error },
        },
    };
}

function chooseNewest(raw, api) {
    if (!raw) return api;
    if (!api) return raw;
    if (raw.revision === api.revision) {
        if (raw.version !== api.version || raw.manifest !== api.manifest || raw.releaseRef !== api.releaseRef) {
            throw new Error(`Discovery sources disagree for r${raw.revision}.`);
        }
        return api;
    }
    return raw.revision > api.revision ? raw : api;
}

async function tryFetchJson(ns, base, sourcePath, localPath, bustValue) {
    try { return { value: await fetchJsonFromBase(ns, base, sourcePath, localPath, bustValue), error: null }; }
    catch (error) { return { value: null, error: String(error?.message ?? error) }; }
}

async function tryFetchApiDescriptor(ns, localPath) {
    try {
        const ok = await ns.wget(API_VERSION_URL, localPath, "home");
        if (!ok) throw new Error("GitHub API request failed.");
        const outer = JSON.parse(ns.read(localPath));
        ns.rm(localPath, "home");
        if (outer?.encoding !== "base64" || typeof outer?.content !== "string") throw new Error("GitHub API response did not contain base64 file content.");
        return { value: JSON.parse(decodeBase64(outer.content)), error: null };
    } catch (error) {
        if (ns.fileExists(localPath, "home")) ns.rm(localPath, "home");
        return { value: null, error: String(error?.message ?? error) };
    }
}

function decodeBase64(value) {
    return decodeURIComponent(escape(atob(value.replace(/\s/g, ""))));
}

function rawBaseForRef(ref) {
    if (!/^[0-9a-f]{40}$/i.test(ref ?? "")) throw new Error("Release descriptor is missing a valid immutable releaseRef.");
    return `https://raw.githubusercontent.com/${REPOSITORY}/${ref}`;
}

function buildRuntimePlan(manifest, stagedFiles, targets, localState) {
    const activeUnits = manifest.runtimeUnits == null ? [] : manifest.runtimeUnits;
    const retiredIds = manifest.retireRuntimeUnits == null ? [] : manifest.retireRuntimeUnits;
    if (!Array.isArray(activeUnits)) throw new Error("Manifest runtimeUnits must be an array.");
    if (!Array.isArray(retiredIds)) throw new Error("Manifest retireRuntimeUnits must be an array.");

    const fileActions = new Map(stagedFiles.map((file) => [file.target, file.action]));
    const ids = new Set();
    const plan = activeUnits.map((unit) => {
        validateRuntimeUnit(unit, targets);
        if (ids.has(unit.id)) throw new Error(`Duplicate runtime unit id: ${unit.id}`);
        ids.add(unit.id);
        return {
            ...unit,
            args: [...unit.args],
            files: [...unit.files],
            changed: unit.files.some((path) => ["updated", "added"].includes(fileActions.get(path))),
            retired: false,
        };
    });

    const previousUnits = Array.isArray(localState?.runtimeUnits) ? localState.runtimeUnits : [];
    const retirementIds = new Set();
    for (const id of retiredIds) {
        if (typeof id !== "string" || !id) throw new Error("Invalid persistent runtime retirement id.");
        if (retirementIds.has(id)) throw new Error(`Duplicate persistent runtime retirement id: ${id}`);
        retirementIds.add(id);
        if (ids.has(id)) throw new Error(`Runtime unit ${id} cannot be active and retired in the same manifest.`);
        const previous = previousUnits.find((unit) => unit?.id === id);
        if (!previous) throw new Error(`Cannot retire unknown persistent runtime unit: ${id}`);
        validateRetirementSource(previous);
        plan.push({
            ...previous,
            args: [...previous.args],
            files: [...previous.files],
            changed: false,
            retired: true,
        });
    }

    return plan;
}

function validateRuntimeUnit(unit, targets) {
    if (!unit || typeof unit.id !== "string" || !unit.id) throw new Error("Runtime unit is missing id.");
    if (unit.lifecycle !== "persistent") throw new Error(`Unsupported runtime lifecycle for ${unit.id}.`);
    if (unit.host !== "home") throw new Error(`Runtime unit ${unit.id} must currently run on home.`);
    if (typeof unit.script !== "string" || !targets.has(unit.script)) throw new Error(`Runtime unit ${unit.id} script is not a deployed manifest target.`);
    if (!Number.isSafeInteger(unit.threads) || unit.threads < 1) throw new Error(`Invalid threads for ${unit.id}.`);
    if (!Array.isArray(unit.args)) throw new Error(`Invalid args for ${unit.id}.`);
    if (!Array.isArray(unit.files) || unit.files.length === 0 || unit.files.some((path) => !targets.has(path))) throw new Error(`Invalid managed files for runtime unit ${unit.id}.`);
    if (!Number.isSafeInteger(unit.restartOrder) || unit.restartOrder < 0) throw new Error(`Invalid restartOrder for ${unit.id}.`);
}

function validateRetirementSource(unit) {
    if (unit.lifecycle !== "persistent") throw new Error(`Retirement source ${unit.id} is not persistent.`);
    if (unit.host !== "home") throw new Error(`Retirement source ${unit.id} is not on home.`);
    if (typeof unit.script !== "string" || !unit.script) throw new Error(`Retirement source ${unit.id} has no script.`);
    if (!Number.isSafeInteger(unit.threads) || unit.threads < 1) throw new Error(`Retirement source ${unit.id} has invalid threads.`);
    if (!Array.isArray(unit.args) || !Array.isArray(unit.files)) throw new Error(`Retirement source ${unit.id} has invalid invocation metadata.`);
    if (!Number.isSafeInteger(unit.restartOrder) || unit.restartOrder < 0) throw new Error(`Retirement source ${unit.id} has invalid restartOrder.`);
}

function runtimeSummary(unit) {
    return {
        id: unit.id,
        lifecycle: unit.lifecycle,
        script: unit.script,
        changed: Boolean(unit.changed),
        retired: Boolean(unit.retired),
        restartOrder: unit.restartOrder,
    };
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
        local: releaseOf(localState),
        remote: { version: null, revision: null, releaseRef: null },
        discovery: null,
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
        runtime: { planned: [], status: "none", units: [] },
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
    return state?.version && Number.isSafeInteger(Number(state?.revision)) ? `${state.version}-r${state.revision}` : "unversioned";
}

function releaseOf(value) {
    return {
        version: value?.version ?? null,
        revision: Number.isSafeInteger(value?.revision) ? value.revision : null,
        releaseRef: value?.releaseRef ?? null,
    };
}

function readJsonFile(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    try { return JSON.parse(ns.read(path)); } catch { return null; }
}

async function fetchJsonFromBase(ns, base, sourcePath, localPath, bustValue) {
    const ok = await ns.wget(cacheBust(`${base}/${sourcePath}`, bustValue), localPath, "home");
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
    if (value.validationFixture !== VALIDATION_FAILURE_FIXTURE) throw new Error("Validation failure descriptor is missing its required fixture marker.");
}

function validateDescriptor(value, requireReleaseRef) {
    if (!value || value.schemaVersion !== 1) throw new Error("Unsupported version descriptor schema.");
    if (!/^v\d+\.\d+\.\d+$/.test(value.version)) throw new Error("Invalid semantic version.");
    if (!Number.isSafeInteger(value.revision) || value.revision < 0) throw new Error("Invalid revision.");
    if (typeof value.manifest !== "string" || !value.manifest) throw new Error("Missing manifest path.");
    if (requireReleaseRef && !/^[0-9a-f]{40}$/i.test(value.releaseRef ?? "")) throw new Error("Missing or invalid immutable releaseRef.");
}

function validateManifest(manifest, descriptor) {
    if (!manifest || manifest.schemaVersion !== 1) throw new Error("Unsupported manifest schema.");
    if (manifest.version !== descriptor.version || manifest.revision !== descriptor.revision) throw new Error("Version descriptor and manifest disagree.");
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) throw new Error("Manifest contains no files.");
    if (manifest.retireRuntimeUnits != null && !Array.isArray(manifest.retireRuntimeUnits)) throw new Error("Manifest retireRuntimeUnits must be an array.");
}

function validateFileEntry(file) {
    if (!file || typeof file.source !== "string" || typeof file.target !== "string") throw new Error("Invalid manifest file entry.");
    if (!file.source || !file.target || file.source.includes("..") || file.target.includes("..")) throw new Error("Unsafe manifest path.");
    if (file.target.startsWith("data/") || file.target.startsWith("/data/")) throw new Error(`Manifest may not deploy protected runtime data: ${file.target}`);
}

function cleanup(ns, paths) {
    for (const path of paths) if (ns.fileExists(path, "home")) ns.rm(path, "home");
}
