const PREFIX = "bitburner-full-stack.dashboard-layout.";
const SCHEMA_VERSION = 1;
const MEMBER_TTL_MS = 4_000;
const DEFAULT_GAP = 6;

export function setDashboardAnchor(group, id) {
    try {
        localStorage.setItem(anchorKey(group), JSON.stringify({
            schemaVersion: SCHEMA_VERSION,
            id,
            changedAt: Date.now(),
        }));
        return true;
    } catch {
        return false;
    }
}

export function getDashboardAnchor(group, members = []) {
    try {
        const value = JSON.parse(localStorage.getItem(anchorKey(group)) || "null");
        if (value?.id && members.some((member) => member.id === value.id)) return value.id;
    } catch {
        // Fall through to deterministic default.
    }
    return [...members].sort(compareMembers)[0]?.id ?? null;
}

export function publishDashboardGeometry(group, member) {
    try {
        const registry = readRegistry(group);
        registry[member.id] = {
            schemaVersion: SCHEMA_VERSION,
            id: member.id,
            order: Number.isFinite(member.order) ? member.order : 100,
            x: Math.round(member.x),
            y: Math.round(member.y),
            width: Math.round(member.width),
            height: Math.round(member.height),
            seenAt: Date.now(),
        };
        writeRegistry(group, prune(registry));
        return true;
    } catch {
        return false;
    }
}

export function removeDashboardGeometry(group, id) {
    try {
        const registry = readRegistry(group);
        delete registry[id];
        writeRegistry(group, prune(registry));
    } catch {
        // Layout coordination is best-effort presentation state.
    }
}

export function calculateDashboardLayout(group, id, options = {}) {
    const gap = Number.isFinite(options.gap) ? options.gap : DEFAULT_GAP;
    const members = Object.values(prune(readRegistry(group))).sort(compareMembers);
    const current = members.find((member) => member.id === id);
    if (!current) return { anchorId: null, isAnchor: false, desiredPosition: null, members };

    let anchorId = getDashboardAnchor(group, members);
    if (!anchorId) anchorId = current.id;
    const anchor = members.find((member) => member.id === anchorId) ?? members[0];
    if (!anchor) return { anchorId: null, isAnchor: false, desiredPosition: null, members };

    if (anchor.id === id) {
        return { anchorId: anchor.id, isAnchor: true, desiredPosition: null, members };
    }

    const followers = members.filter((member) => member.id !== anchor.id).sort(compareMembers);
    let y = anchor.y + anchor.height + gap;
    for (const follower of followers) {
        if (follower.id === id) {
            return {
                anchorId: anchor.id,
                isAnchor: false,
                desiredPosition: clampToViewport(anchor.x, y, follower.width, follower.height),
                members,
            };
        }
        y += follower.height + gap;
    }
    return { anchorId: anchor.id, isAnchor: false, desiredPosition: null, members };
}

export function isDashboardAnchor(group, id) {
    const members = Object.values(prune(readRegistry(group)));
    return getDashboardAnchor(group, members) === id;
}

function readRegistry(group) {
    try {
        const value = JSON.parse(localStorage.getItem(registryKey(group)) || "{}");
        return value && typeof value === "object" ? value : {};
    } catch {
        return {};
    }
}

function writeRegistry(group, registry) {
    localStorage.setItem(registryKey(group), JSON.stringify(registry));
}

function prune(registry) {
    const cutoff = Date.now() - MEMBER_TTL_MS;
    return Object.fromEntries(Object.entries(registry).filter(([, member]) =>
        member?.id && Number.isFinite(member.seenAt) && member.seenAt >= cutoff));
}

function compareMembers(a, b) {
    return (a.order - b.order) || a.id.localeCompare(b.id);
}

function clampToViewport(x, y, width, height) {
    const viewportWidth = Math.max(96, window.innerWidth || 96);
    const viewportHeight = Math.max(36, window.innerHeight || 36);
    return {
        x: clamp(x, 0, Math.max(0, viewportWidth - Math.min(width, 96))),
        y: clamp(y, 0, Math.max(0, viewportHeight - Math.min(height, 36))),
    };
}

function anchorKey(group) { return `${PREFIX}${group}.anchor`; }
function registryKey(group) { return `${PREFIX}${group}.members`; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
