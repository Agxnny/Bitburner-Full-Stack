import { calculateDashboardLayout, isDashboardAnchor, publishDashboardGeometry, removeDashboardGeometry } from "./dashboard-layout-coordinator.js";

const STORAGE_PREFIX = "bitburner-full-stack.dashboard-window.";
const SCHEMA_VERSION = 2;
const TITLE_VISIBLE_WIDTH = 96;
const TITLE_VISIBLE_HEIGHT = 36;
const SAVE_ARM_DELAY_MS = 500;
const SAVE_DEBOUNCE_MS = 120;
const SIZE_DEBOUNCE_MS = 100;
const SIZE_TOLERANCE_PX = 3;
const POSITION_TOLERANCE_PX = 2;
const LAYOUT_POLL_MS = 200;

export async function restoreDashboardPosition(ns, key, pid = ns.pid) {
    const position = readDashboardPosition(key);
    if (!position) return false;
    ns.ui.moveTail(position.x, position.y, pid);
    return true;
}

export function applyDashboardPosition(ns, bridge, pid = ns.pid) {
    const desired = bridge?.desiredPosition;
    if (!desired || !Number.isFinite(desired.x) || !Number.isFinite(desired.y)) return false;
    const applied = bridge.appliedPosition;
    if (applied
        && Math.abs(applied.x - desired.x) <= POSITION_TOLERANCE_PX
        && Math.abs(applied.y - desired.y) <= POSITION_TOLERANCE_PX) return false;
    ns.ui.moveTail(Math.round(desired.x), Math.round(desired.y), pid);
    bridge.appliedPosition = { x: Math.round(desired.x), y: Math.round(desired.y) };
    return true;
}

export function applyDashboardSize(ns, bridge, pid = ns.pid) {
    const desired = bridge?.desiredSize;
    if (!desired || !Number.isFinite(desired.width) || !Number.isFinite(desired.height)) return false;

    const width = Math.round(desired.width);
    const height = Math.round(desired.height);
    const applied = bridge.appliedSize;
    if (applied
        && Math.abs(applied.width - width) <= SIZE_TOLERANCE_PX
        && Math.abs(applied.height - height) <= SIZE_TOLERANCE_PX) return false;

    ns.ui.resizeTail(width, height, pid);
    bridge.appliedSize = { width, height };
    return true;
}

export function useDashboardWindow(key, bridge, options = {}) {
    const rootRef = React.useRef(null);
    const minWidth = options.minWidth ?? 320;
    const minHeight = options.minHeight ?? 120;
    const maxWidth = options.maxWidth ?? 1200;
    const maxHeight = options.maxHeight ?? 900;
    const layoutGroup = options.layoutGroup ?? null;
    const layoutOrder = options.layoutOrder ?? 100;
    const layoutGap = options.layoutGap ?? 6;

    React.useEffect(() => {
        const root = rootRef.current;
        const resizable = root?.closest?.(".react-resizable") ?? null;
        const frame = resizable?.parentElement ?? null;
        const contentViewport = findContentViewport(root, resizable);
        if (!root || !resizable || !frame || !contentViewport) return undefined;

        let armed = false;
        let positionTimer = null;
        let sizeTimer = null;
        let layoutTimer = null;

        const measure = () => {
            const rootRect = root.getBoundingClientRect();
            const resizableRect = resizable.getBoundingClientRect();
            const nativeWidthOverhead = Math.max(0, resizable.clientWidth - contentViewport.clientWidth);
            const nativeHeightOverhead = Math.max(0, resizable.clientHeight - contentViewport.clientHeight);

            const contentWidth = Math.max(root.scrollWidth, Math.ceil(rootRect.width));
            const contentHeight = Math.max(root.scrollHeight, Math.ceil(rootRect.height));
            const viewportWidth = Math.max(minWidth, window.innerWidth || minWidth);
            const viewportHeight = Math.max(minHeight, window.innerHeight || minHeight);

            bridge.desiredSize = {
                width: clamp(
                    Math.ceil(contentWidth + nativeWidthOverhead),
                    minWidth,
                    Math.min(maxWidth, viewportWidth - 8),
                ),
                height: clamp(
                    Math.ceil(contentHeight + nativeHeightOverhead),
                    minHeight,
                    Math.min(maxHeight, viewportHeight - 8),
                ),
            };
            bridge.windowMetrics = {
                measuredAt: Date.now(),
                nativeOverhead: { width: nativeWidthOverhead, height: nativeHeightOverhead },
                content: { width: contentWidth, height: contentHeight },
                resizable: { width: resizableRect.width, height: resizableRect.height },
                viewport: { width: contentViewport.clientWidth, height: contentViewport.clientHeight },
            };
        };

        const measureSoon = () => {
            if (sizeTimer !== null) clearTimeout(sizeTimer);
            sizeTimer = setTimeout(measure, SIZE_DEBOUNCE_MS);
        };

        const updateLayout = () => {
            if (!layoutGroup) return;
            const rect = resizable.getBoundingClientRect();
            publishDashboardGeometry(layoutGroup, {
                id: key, order: layoutOrder,
                x: rect.left, y: rect.top, width: rect.width, height: rect.height,
            });
            const layout = calculateDashboardLayout(layoutGroup, key, { gap: layoutGap });
            bridge.layout = { anchorId: layout.anchorId, isAnchor: layout.isAnchor, memberCount: layout.members.length };
            bridge.desiredPosition = layout.desiredPosition;
            if (layout.isAnchor) {
                bridge.appliedPosition = null;
                bridge.desiredPosition = null;
            }
        };

        const persistPositionSoon = () => {
            if (!armed) return;
            if (layoutGroup && !isDashboardAnchor(layoutGroup, key)) return;
            if (positionTimer !== null) clearTimeout(positionTimer);
            positionTimer = setTimeout(() => saveDashboardPosition(key, resizable), SAVE_DEBOUNCE_MS);
        };

        const resizeObserver = new ResizeObserver(measureSoon);
        resizeObserver.observe(root);
        resizeObserver.observe(contentViewport);
        resizeObserver.observe(resizable);

        const mutationObserver = new MutationObserver(persistPositionSoon);
        mutationObserver.observe(frame, { attributes: true, attributeFilter: ["style"] });

        window.addEventListener("resize", measureSoon);
        const armTimer = setTimeout(() => {
            armed = true;
            if (!layoutGroup || isDashboardAnchor(layoutGroup, key)) saveDashboardPosition(key, resizable);
            measure();
            updateLayout();
            layoutTimer = setInterval(updateLayout, LAYOUT_POLL_MS);
        }, SAVE_ARM_DELAY_MS);
        measure();

        return () => {
            armed = false;
            clearTimeout(armTimer);
            if (positionTimer !== null) clearTimeout(positionTimer);
            if (sizeTimer !== null) clearTimeout(sizeTimer);
            if (layoutTimer !== null) clearInterval(layoutTimer);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("resize", measureSoon);
            if (layoutGroup) removeDashboardGeometry(layoutGroup, key);
        };
    }, [key, bridge, minWidth, minHeight, maxWidth, maxHeight, layoutGroup, layoutOrder, layoutGap]);

    return rootRef;
}

export function readDashboardPosition(key) {
    try {
        const raw = localStorage.getItem(storageKey(key));
        if (!raw) return null;
        const value = JSON.parse(raw);
        if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
        return clampPosition(value);
    } catch {
        return null;
    }
}

function findContentViewport(root, resizable) {
    let node = root?.parentElement ?? null;
    let fallback = null;
    while (node && node !== resizable) {
        const css = getComputedStyle(node);
        const scrollsY = css.overflowY === "scroll" || css.overflowY === "auto";
        if (!fallback && scrollsY) fallback = node;
        if (css.display === "flex" && css.flexDirection === "column-reverse" && scrollsY) return node;
        node = node.parentElement;
    }
    return fallback;
}

function saveDashboardPosition(key, resizable) {
    try {
        const rect = resizable.getBoundingClientRect();
        const position = clampPosition({
            schemaVersion: SCHEMA_VERSION,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            savedAt: Date.now(),
        });
        localStorage.setItem(storageKey(key), JSON.stringify(position));
    } catch {
        // Position memory is best-effort and must never break a dashboard.
    }
}

function clampPosition(value) {
    const viewportWidth = Math.max(TITLE_VISIBLE_WIDTH, window.innerWidth || TITLE_VISIBLE_WIDTH);
    const viewportHeight = Math.max(TITLE_VISIBLE_HEIGHT, window.innerHeight || TITLE_VISIBLE_HEIGHT);
    return {
        schemaVersion: SCHEMA_VERSION,
        x: clamp(value.x, 0, Math.max(0, viewportWidth - TITLE_VISIBLE_WIDTH)),
        y: clamp(value.y, 0, Math.max(0, viewportHeight - TITLE_VISIBLE_HEIGHT)),
        savedAt: Number.isFinite(value.savedAt) ? value.savedAt : Date.now(),
    };
}

function storageKey(key) {
    return `${STORAGE_PREFIX}${key}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
}
