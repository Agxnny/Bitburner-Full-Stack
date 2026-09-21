const PREFIX = "bitburner-full-stack.dashboard-layout.";
const SCHEMA_VERSION = 2;
const MEMBER_TTL_MS = 4_000;
const DEFAULT_GAP = 6;
const SIDES = new Set(["top", "bottom", "left", "right"]);

export function setDashboardAnchor(group, id) {
    try {
        const members = Object.values(prune(readRegistry(group)));
        const previous = getDashboardAnchor(group, members);
        if (previous && previous !== id) {
            const side = getDockSide(group, id, previous);
            if (side) setDockSide(group, previous, id, inverse(side));
        }
        localStorage.setItem(anchorKey(group), JSON.stringify({ schemaVersion: SCHEMA_VERSION, id, changedAt: Date.now() }));
        return true;
    } catch { return false; }
}

export function getDashboardAnchor(group, members = []) {
    try {
        const value = JSON.parse(localStorage.getItem(anchorKey(group)) || "null");
        if (value?.id && members.some((member) => member.id === value.id)) return value.id;
    } catch {}
    return [...members].sort(compareMembers)[0]?.id ?? null;
}

export function setDockSide(group, followerId, anchorId, side) {
    if (!SIDES.has(side)) return false;
    try {
        const value = readDocks(group);
        value[followerId] = { schemaVersion: SCHEMA_VERSION, anchorId, side, changedAt: Date.now() };
        localStorage.setItem(docksKey(group), JSON.stringify(value));
        return true;
    } catch { return false; }
}

export function getDockSide(group, followerId, anchorId) {
    try {
        const entry = readDocks(group)[followerId];
        return entry?.anchorId === anchorId && SIDES.has(entry.side) ? entry.side : null;
    } catch { return null; }
}

export function chooseDockSide(anchor, follower) {
    const cx = follower.x + follower.width / 2;
    const cy = follower.y + follower.height / 2;
    const ax = anchor.x + anchor.width / 2;
    const ay = anchor.y + anchor.height / 2;
    const dx = cx - ax;
    const dy = cy - ay;
    const nx = dx / Math.max(1, (anchor.width + follower.width) / 2);
    const ny = dy / Math.max(1, (anchor.height + follower.height) / 2);
    return Math.abs(nx) > Math.abs(ny) ? (nx < 0 ? "left" : "right") : (ny < 0 ? "top" : "bottom");
}

export function publishDashboardGeometry(group, member) {
    try {
        const registry = readRegistry(group);
        registry[member.id] = {
            schemaVersion: SCHEMA_VERSION, id: member.id,
            order: Number.isFinite(member.order) ? member.order : 100,
            x: Math.round(member.x), y: Math.round(member.y),
            width: Math.round(member.width), height: Math.round(member.height), seenAt: Date.now(),
        };
        writeRegistry(group, prune(registry));
        return true;
    } catch { return false; }
}

export function removeDashboardGeometry(group, id) {
    try {
        const registry = readRegistry(group);
        delete registry[id];
        writeRegistry(group, prune(registry));
    } catch {}
}

export function calculateDashboardLayout(group, id, options = {}) {
    const gap = Number.isFinite(options.gap) ? options.gap : DEFAULT_GAP;
    const members = Object.values(prune(readRegistry(group))).sort(compareMembers);
    const current = members.find((member) => member.id === id);
    if (!current) return empty(members);

    const anchorId = getDashboardAnchor(group, members) ?? current.id;
    const anchor = members.find((member) => member.id === anchorId) ?? members[0];
    if (!anchor) return empty(members);
    if (anchor.id === id) return { anchorId: anchor.id, anchor, isAnchor: true, side: null, desiredPosition: null, members };

    const followers = members.filter((member) => member.id !== anchor.id);
    const side = getDockSide(group, id, anchor.id) ?? "bottom";
    const sameSide = followers.filter((member) => (getDockSide(group, member.id, anchor.id) ?? "bottom") === side).sort(compareMembers);
    let x = anchor.x;
    let y = anchor.y;

    if (side === "bottom") {
        y = anchor.y + anchor.height + gap;
        for (const member of sameSide) { if (member.id === id) break; y += member.height + gap; }
    } else if (side === "top") {
        y = anchor.y - gap;
        for (const member of sameSide) { y -= member.height; if (member.id === id) break; y -= gap; }
    } else if (side === "right") {
        x = anchor.x + anchor.width + gap;
        for (const member of sameSide) { if (member.id === id) break; x += member.width + gap; }
    } else {
        x = anchor.x - gap;
        for (const member of sameSide) { x -= member.width; if (member.id === id) break; x -= gap; }
    }

    return {
        anchorId: anchor.id, anchor, isAnchor: false, side,
        desiredPosition: clampToViewport(x, y, current.width, current.height), members,
    };
}

export function isDashboardAnchor(group, id) {
    const members = Object.values(prune(readRegistry(group)));
    return getDashboardAnchor(group, members) === id;
}

function empty(members) { return { anchorId: null, anchor: null, isAnchor: false, side: null, desiredPosition: null, members }; }
function readRegistry(group) {
    try { const value = JSON.parse(localStorage.getItem(registryKey(group)) || "{}"); return value && typeof value === "object" ? value : {}; }
    catch { return {}; }
}
function readDocks(group) {
    try { const value = JSON.parse(localStorage.getItem(docksKey(group)) || "{}"); return value && typeof value === "object" ? value : {}; }
    catch { return {}; }
}
function writeRegistry(group, registry) { localStorage.setItem(registryKey(group), JSON.stringify(registry)); }
function prune(registry) {
    const cutoff = Date.now() - MEMBER_TTL_MS;
    return Object.fromEntries(Object.entries(registry).filter(([, member]) => member?.id && Number.isFinite(member.seenAt) && member.seenAt >= cutoff));
}
function compareMembers(a, b) { return (a.order - b.order) || a.id.localeCompare(b.id); }
function inverse(side) { return ({ top:"bottom", bottom:"top", left:"right", right:"left" })[side]; }
function clampToViewport(x, y, width, height) {
    const vw = Math.max(96, window.innerWidth || 96);
    const vh = Math.max(36, window.innerHeight || 36);
    return { x: clamp(x, 0, Math.max(0, vw - Math.min(width, 96))), y: clamp(y, 0, Math.max(0, vh - Math.min(height, 36))) };
}
function anchorKey(group) { return `${PREFIX}${group}.anchor`; }
function registryKey(group) { return `${PREFIX}${group}.members`; }
function docksKey(group) { return `${PREFIX}${group}.docks`; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
