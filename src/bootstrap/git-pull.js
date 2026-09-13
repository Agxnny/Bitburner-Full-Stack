/**
 * Standalone bootstrap puller for Bitburner Full Stack.
 * Keep this file dependency-free so it can recover the rest of the project.
 */

const REPOSITORY = "Agxnny/Bitburner-Full-Stack";
const BRANCH = "main";
const RAW_BASE = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;
const VERSION_PATH = "deployment/version.json";
const STATE_PATH = "data/deployment-state.txt";
const PENDING_STATE_PATH = "data/deployment-pending.txt";
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
    ]);

    if (ns.getHostname() !== "home") {
        ns.tprint("ERROR: git-pull must be run on home.");
        return;
    }

    const nonce = `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`;
    const localState = readJsonFile(ns, STATE_PATH);

    try {
        ns.tprint("git-pull: checking remote deployment state...");

        const descriptor = await fetchJson(
            ns,
            VERSION_PATH,
            `${STAGE_ROOT}/version-${nonce}.txt`,
            nonce,
        );
        validateDescriptor(descriptor);

        const expectedRevision = Number(flags["expect-revision"]);
        if (expectedRevision >= 0 && descriptor.revision !== expectedRevision) {
            throw new Error(
                `Approved r${expectedRevision} is no longer current; remote is r${descriptor.revision}.`,
            );
        }

        const localRevision = Number(localState?.revision ?? -1);
        if (descriptor.revision < localRevision && !flags["allow-downgrade"]) {
            throw new Error(
                `Refusing downgrade r${localRevision} -> r${descriptor.revision}.`,
            );
        }

        if (descriptor.revision === localRevision && !flags.force) {
            ns.tprint(`git-pull: already current at ${descriptor.version}-r${descriptor.revision}.`);
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
        for (let index = 0; index < manifest.files.length; index++) {
            const file = manifest.files[index];
            validateFileEntry(file);

            const stagePath = `${STAGE_ROOT}/r${descriptor.revision}-${index}.txt`;
            const url = cacheBust(`${RAW_BASE}/${file.source}`, `r${descriptor.revision}-${nonce}`);
            const ok = await ns.wget(url, stagePath, "home");
            if (!ok) throw new Error(`Download failed: ${file.source}`);

            const content = ns.read(stagePath);
            if (!content || content.length === 0) {
                throw new Error(`Downloaded file is empty: ${file.source}`);
            }

            stagedFiles.push({ ...file, stagePath, content });
        }

        ns.tprint(
            `git-pull: staged ${stagedFiles.length} files for ${descriptor.version}-r${descriptor.revision}.`,
        );

        if (flags["dry-run"]) {
            ns.tprint("git-pull: dry run complete; no files activated.");
            cleanup(ns, stagedFiles.map((file) => file.stagePath));
            return;
        }

        const selfEntry = stagedFiles.find((file) => file.target === SELF_PATH);
        const helperEntry = stagedFiles.find((file) => file.target === SELF_HELPER_PATH);
        if (!selfEntry) throw new Error(`Manifest must include ${SELF_PATH}.`);
        if (!helperEntry) throw new Error(`Manifest must include ${SELF_HELPER_PATH}.`);

        // Activate every file except this running puller. The helper is safe to
        // replace now because it is not running yet.
        for (const file of stagedFiles) {
            if (file.target === SELF_PATH) continue;
            ns.write(file.target, file.content, "w");
        }

        const pendingState = {
            schemaVersion: 1,
            version: descriptor.version,
            revision: descriptor.revision,
            manifest: descriptor.manifest,
            source: selfEntry.source,
            previousVersion: localState?.version ?? null,
            previousRevision: localState?.revision ?? null,
            stagedAt: Date.now(),
        };
        ns.write(PENDING_STATE_PATH, JSON.stringify(pendingState, null, 2), "w");

        cleanup(
            ns,
            stagedFiles
                .filter((file) => file.target !== SELF_PATH)
                .map((file) => file.stagePath),
        );

        const helperPid = ns.run(
            SELF_HELPER_PATH,
            1,
            "--wait-pid",
            ns.pid,
            "--revision",
            descriptor.revision,
            "--nonce",
            nonce,
        );

        if (helperPid === 0) {
            throw new Error("Could not start git-pull self-update helper.");
        }

        ns.tprint(
            `git-pull: activated ${descriptor.version}-r${descriptor.revision}; self-update helper ${helperPid} will refresh git-pull after this process exits.`,
        );
    } catch (error) {
        ns.tprint(`ERROR: git-pull failed: ${String(error?.message ?? error)}`);
    }
}

function readJsonFile(ns, path) {
    if (!ns.fileExists(path, "home")) return null;
    const text = ns.read(path);
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

async function fetchJson(ns, sourcePath, localPath, bustValue) {
    const ok = await ns.wget(cacheBust(`${RAW_BASE}/${sourcePath}`, bustValue), localPath, "home");
    if (!ok) throw new Error(`Download failed: ${sourcePath}`);

    const text = ns.read(localPath);
    ns.rm(localPath, "home");
    if (!text) throw new Error(`Downloaded metadata is empty: ${sourcePath}`);

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Invalid JSON: ${sourcePath}`);
    }
}

function cacheBust(url, value) {
    return `${url}${url.includes("?") ? "&" : "?"}cb=${encodeURIComponent(value)}`;
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
    if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
        throw new Error("Manifest contains no files.");
    }
}

function validateFileEntry(file) {
    if (!file || typeof file.source !== "string" || typeof file.target !== "string") {
        throw new Error("Invalid manifest file entry.");
    }
    if (!file.source || !file.target || file.source.includes("..") || file.target.includes("..")) {
        throw new Error("Unsafe manifest path.");
    }
    if (file.target.startsWith("data/")) {
        throw new Error(`Manifest may not deploy protected runtime data: ${file.target}`);
    }
}

function cleanup(ns, paths) {
    for (const path of paths) {
        if (ns.fileExists(path, "home")) ns.rm(path, "home");
    }
}
