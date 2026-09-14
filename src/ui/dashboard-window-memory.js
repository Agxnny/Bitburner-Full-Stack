const STORAGE_PREFIX = "bitburner-full-stack.dashboard-window.";
const SCHEMA_VERSION = 1;
const MIN_WIDTH = 150;
const MIN_HEIGHT = 80;
const TITLE_VISIBLE_WIDTH = 96;
const TITLE_VISIBLE_HEIGHT = 36;
const SAVE_ARM_DELAY_MS = 500;
const SAVE_DEBOUNCE_MS = 120;

export async function restoreDashboardWindow(ns, key, pid = ns.pid) {
    const geometry = readDashboardWindowMemory(key);
    if (!geometry) return false;

    ns.ui.resizeTail(geometry.width, geometry.height, pid);
    ns.ui.moveTail(geometry.x, geometry.y, pid);
    return true;
}

export function useDashboardWindowMemory(key) {
    const rootRef = React.useRef(null);

    React.useEffect(() => {
        const root = rootRef.current;
        const resizable = root?.closest?.(".react-resizable") ?? null;
        const frame = resizable?.parentElement ?? null;
        if (!resizable || !frame) return undefined;

        let armed = false;
        let timer = null;

        const persistSoon = () => {
            if (!armed) return;
            if (timer !== null) clearTimeout(timer);
            timer = setTimeout(() => saveDashboardWindowMemory(key, resizable), SAVE_DEBOUNCE_MS);
        };

        const resizeObserver = new ResizeObserver(persistSoon);
        resizeObserver.observe(resizable);

        const mutationObserver = new MutationObserver(persistSoon);
        mutationObserver.observe(frame, { attributes: true, attributeFilter: ["style"] });

        window.addEventListener("resize", persistSoon);
        const armTimer = setTimeout(() => {
            armed = true;
            saveDashboardWindowMemory(key, resizable);
        }, SAVE_ARM_DELAY_MS);

        return () => {
            armed = false;
            clearTimeout(armTimer);
            if (timer !== null) clearTimeout(timer);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("resize", persistSoon);
        };
    }, [key]);

    return rootRef;
}

export function readDashboardWindowMemory(key) {
    try {
        const raw = localStorage.getItem(storageKey(key));
        if (!raw) return null;
        const value = JSON.parse(raw);
        if (!validGeometry(value)) return null;
        return clampGeometry(value);
    } catch {
        return null;
    }
}

function saveDashboardWindowMemory(key, resizable) {
    try {
        const rect = resizable.getBoundingClientRect();
        const geometry = clampGeometry({
            schemaVersion: SCHEMA_VERSION,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            savedAt: Date.now(),
        });
        localStorage.setItem(storageKey(key), JSON.stringify(geometry));
    } catch {
        // Window memory is best-effort and must never break a dashboard.
    }
}

function clampGeometry(value) {
    const viewportWidth = Math.max(MIN_WIDTH, window.innerWidth || MIN_WIDTH);
    const viewportHeight = Math.max(MIN_HEIGHT, window.innerHeight || MIN_HEIGHT);
    const width = clamp(value.width, MIN_WIDTH, Math.max(MIN_WIDTH, viewportWidth - 8));
    const height = clamp(value.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, viewportHeight - 8));
    const maxX = Math.max(0, viewportWidth - Math.min(width, TITLE_VISIBLE_WIDTH));
    const maxY = Math.max(0, viewportHeight - TITLE_VISIBLE_HEIGHT);

    return {
        schemaVersion: SCHEMA_VERSION,
        x: clamp(value.x, 0, maxX),
        y: clamp(value.y, 0, maxY),
        width,
        height,
        savedAt: Number.isFinite(value.savedAt) ? value.savedAt : Date.now(),
    };
}

function validGeometry(value) {
    return Boolean(
        value
        && value.schemaVersion === SCHEMA_VERSION
        && [value.x, value.y, value.width, value.height].every(Number.isFinite),
    );
}

function storageKey(key) {
    return `${STORAGE_PREFIX}${key}`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
}
