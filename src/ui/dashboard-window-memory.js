import { calculateDashboardLayout, chooseDockSide, isDashboardAnchor, publishDashboardGeometry, removeDashboardGeometry, setDockSide } from "./dashboard-layout-coordinator.js";

const STORAGE_PREFIX = "bitburner-full-stack.dashboard-window.";
const SCHEMA_VERSION = 2;
const TITLE_VISIBLE_WIDTH = 96;
const TITLE_VISIBLE_HEIGHT = 36;
const SAVE_ARM_DELAY_MS = 500;
const SAVE_DEBOUNCE_MS = 120;
const SIZE_DEBOUNCE_MS = 100;
const SIZE_TOLERANCE_PX = 3;
const POSITION_TOLERANCE_PX = 2;
const MANUAL_DRAG_THRESHOLD_PX = 12;
const DRAG_SETTLE_MS = 220;
const LAYOUT_POLL_MS = 120;

export async function restoreDashboardPosition(ns, key, pid = ns.pid) {
    const position = readDashboardPosition(key);
    if (!position) return false;
    ns.ui.moveTail(position.x, position.y, pid);
    return true;
}

export function applyDashboardPosition(ns, bridge, pid = ns.pid) {
    const desired = bridge?.desiredPosition;
    if (!desired || bridge?.layout?.dragging || !Number.isFinite(desired.x) || !Number.isFinite(desired.y)) return false;
    const applied = bridge.appliedPosition;
    if (applied && Math.abs(applied.x - desired.x) <= POSITION_TOLERANCE_PX && Math.abs(applied.y - desired.y) <= POSITION_TOLERANCE_PX) return false;
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
    if (applied && Math.abs(applied.width - width) <= SIZE_TOLERANCE_PX && Math.abs(applied.height - height) <= SIZE_TOLERANCE_PX) return false;
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
    const widthProbeSelector = options.widthProbeSelector ?? null;
    const widthProbeExtra = Math.max(0, options.widthProbeExtra ?? 0);
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
        let dragTimer = null;
        let suppressUntil = 0;

        const measure = () => {
            const rootRect = root.getBoundingClientRect();
            const resizableRect = resizable.getBoundingClientRect();
            const nativeWidthOverhead = Math.max(0, resizable.clientWidth - contentViewport.clientWidth);
            const nativeHeightOverhead = Math.max(0, resizable.clientHeight - contentViewport.clientHeight);
            const probe = widthProbeSelector ? root.querySelector(widthProbeSelector) : null;
            const rootCss = getComputedStyle(root);
            const horizontalChrome = parseFloat(rootCss.paddingLeft || "0") + parseFloat(rootCss.paddingRight || "0");
            const probeWidth = probe ? Math.ceil(intrinsicRowWidth(probe) + horizontalChrome + widthProbeExtra) : 0;
            const contentWidth = probe ? probeWidth : Math.max(root.scrollWidth, Math.ceil(rootRect.width));
            const contentHeight = Math.max(root.scrollHeight, Math.ceil(rootRect.height));
            const vw = Math.max(minWidth, window.innerWidth || minWidth);
            const vh = Math.max(minHeight, window.innerHeight || minHeight);
            const availableHeight = Math.max(minHeight, vh - Math.max(0, resizableRect.top) - 8);
            bridge.desiredSize = {
                width: clamp(Math.ceil(contentWidth + nativeWidthOverhead), minWidth, Math.min(maxWidth, vw - 8)),
                height: clamp(Math.ceil(contentHeight + nativeHeightOverhead), minHeight, Math.min(maxHeight, availableHeight)),
            };
            bridge.windowMetrics = {
                measuredAt: Date.now(), nativeOverhead: { width:nativeWidthOverhead, height:nativeHeightOverhead },
                content: { width:contentWidth, height:contentHeight, widthProbeExtra }, resizable: { width:resizableRect.width, height:resizableRect.height },
                viewport: { width:contentViewport.clientWidth, height:contentViewport.clientHeight, availableHeight },
            };
        };

        const measureSoon = () => {
            if (sizeTimer !== null) clearTimeout(sizeTimer);
            sizeTimer = setTimeout(measure, SIZE_DEBOUNCE_MS);
        };

        const updateLayout = () => {
            if (!layoutGroup) return;
            const rect = resizable.getBoundingClientRect();
            publishDashboardGeometry(layoutGroup, { id:key, order:layoutOrder, x:rect.left, y:rect.top, width:rect.width, height:rect.height });
            const layout = calculateDashboardLayout(layoutGroup, key, { gap:layoutGap });
            const dragging = bridge.layout?.dragging === true;
            bridge.layout = { anchorId:layout.anchorId, isAnchor:layout.isAnchor, side:layout.side, memberCount:layout.members.length, dragging };
            if (!dragging) bridge.desiredPosition = layout.desiredPosition;
            if (layout.isAnchor) {
                bridge.appliedPosition = null;
                bridge.desiredPosition = null;
            }
        };

        const finishFollowerDrag = () => {
            if (!layoutGroup || isDashboardAnchor(layoutGroup, key)) return;
            const rect = resizable.getBoundingClientRect();
            publishDashboardGeometry(layoutGroup, { id:key, order:layoutOrder, x:rect.left, y:rect.top, width:rect.width, height:rect.height });
            const layout = calculateDashboardLayout(layoutGroup, key, { gap:layoutGap });
            if (layout.anchor) {
                const follower = { x:rect.left, y:rect.top, width:rect.width, height:rect.height };
                setDockSide(layoutGroup, key, layout.anchor.id, chooseDockSide(layout.anchor, follower));
            }
            bridge.layout = { ...(bridge.layout ?? {}), dragging:false };
            bridge.appliedPosition = null;
            updateLayout();
        };

        const nativeMoveObserved = () => {
            if (!armed || !layoutGroup || isDashboardAnchor(layoutGroup, key)) return;
            if (Date.now() < suppressUntil) return;
            const desired = bridge.desiredPosition;
            if (!desired) return;
            const rect = resizable.getBoundingClientRect();
            const departed = Math.hypot(rect.left - desired.x, rect.top - desired.y) > MANUAL_DRAG_THRESHOLD_PX;
            if (!departed && !bridge.layout?.dragging) return;
            bridge.layout = { ...(bridge.layout ?? {}), dragging:true };
            bridge.desiredPosition = null;
            if (dragTimer !== null) clearTimeout(dragTimer);
            dragTimer = setTimeout(finishFollowerDrag, DRAG_SETTLE_MS);
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
        const mutationObserver = new MutationObserver(() => { persistPositionSoon(); nativeMoveObserved(); });
        mutationObserver.observe(frame, { attributes:true, attributeFilter:["style"] });
        const contentMutationObserver = new MutationObserver(measureSoon);
        contentMutationObserver.observe(root, { childList:true, subtree:true, characterData:true });
        window.addEventListener("resize", measureSoon);

        const armTimer = setTimeout(() => {
            armed = true;
            if (!layoutGroup || isDashboardAnchor(layoutGroup, key)) saveDashboardPosition(key, resizable);
            measure();
            updateLayout();
            layoutTimer = setInterval(() => {
                const before = bridge.desiredPosition;
                updateLayout();
                if (bridge.desiredPosition && (!before || before.x !== bridge.desiredPosition.x || before.y !== bridge.desiredPosition.y)) suppressUntil = Date.now() + 180;
            }, LAYOUT_POLL_MS);
        }, SAVE_ARM_DELAY_MS);
        measure();

        return () => {
            armed = false;
            clearTimeout(armTimer);
            if (positionTimer !== null) clearTimeout(positionTimer);
            if (sizeTimer !== null) clearTimeout(sizeTimer);
            if (dragTimer !== null) clearTimeout(dragTimer);
            if (layoutTimer !== null) clearInterval(layoutTimer);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            contentMutationObserver.disconnect();
            window.removeEventListener("resize", measureSoon);
            if (layoutGroup) removeDashboardGeometry(layoutGroup, key);
        };
    }, [key, bridge, minWidth, minHeight, maxWidth, maxHeight, widthProbeSelector, widthProbeExtra, layoutGroup, layoutOrder, layoutGap]);

    return rootRef;
}

export function readDashboardPosition(key) {
    try {
        const value = JSON.parse(localStorage.getItem(storageKey(key)) || "null");
        if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
        return clampPosition(value);
    } catch { return null; }
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
        localStorage.setItem(storageKey(key), JSON.stringify(clampPosition({ schemaVersion:SCHEMA_VERSION, x:Math.round(rect.left), y:Math.round(rect.top), savedAt:Date.now() })));
    } catch {}
}
function clampPosition(value) {
    const vw = Math.max(TITLE_VISIBLE_WIDTH, window.innerWidth || TITLE_VISIBLE_WIDTH);
    const vh = Math.max(TITLE_VISIBLE_HEIGHT, window.innerHeight || TITLE_VISIBLE_HEIGHT);
    return { schemaVersion:SCHEMA_VERSION, x:clamp(value.x,0,Math.max(0,vw-TITLE_VISIBLE_WIDTH)), y:clamp(value.y,0,Math.max(0,vh-TITLE_VISIBLE_HEIGHT)), savedAt:Number.isFinite(value.savedAt)?value.savedAt:Date.now() };
}
function intrinsicRowWidth(element) {
    const css = getComputedStyle(element);
    const padding = parseFloat(css.paddingLeft || "0") + parseFloat(css.paddingRight || "0");
    const gap = parseFloat(css.columnGap || css.gap || "0");
    const children = [...element.children];
    const childWidth = children.reduce((sum, child) => sum + child.getBoundingClientRect().width, 0);
    return Math.ceil(padding + childWidth + Math.max(0, children.length - 1) * gap);
}
function storageKey(key) { return `${STORAGE_PREFIX}${key}`; }
function clamp(value,min,max) { return Math.min(max,Math.max(min,Number(value))); }
