# UI

React dashboard code and shared presentation components.

Planned surfaces:
- Production Dashboard: live operational behavior and resource usage.
- Validation Dashboard: correctness, health, freshness, reconciliation, invariants, and diagnostics.

UI code consumes structured telemetry and sends commands through standard control interfaces; it is not a source of truth.

## Shared visual language

All dashboards use the same dark grey-blue visual system:
- near-black / charcoal page background
- blue-grey raised surfaces
- cool blue borders and dividers
- bright blue primary actions and active accents
- pale blue-grey secondary text
- green for healthy/online state
- amber for attention/update state
- red only for explicit failure/error state

The M1 update dashboard uses the ultra-compact variant of this language. The later Production Dashboard should use the same palette with larger status-card compositions similar to the approved compact status-card concept rather than copying the updater's single-row layout.

Implementation should use ordinary React elements and inline/shared styles without external UI dependencies so components remain compatible with Bitburner's built-in React environment.

## Shared dashboard position and dynamic sizing

All dashboard tails use `dashboard-window-memory.js` with a stable dashboard-specific key.

**Position is user-owned persistent presentation state.** Dragging a dashboard stores its position in browser local storage and restores that position after relaunch. Existing schema-v1 geometry records are accepted for migration, but their saved width/height are ignored.

**Size is dashboard-owned runtime state.** Manual user resizing is not persisted or restored. React measures the rendered dashboard content with ordinary DOM/`ResizeObserver` APIs and writes a debounced desired size into the dashboard's in-memory bridge. The script `main()` path is the sole owner of `ns.ui.resizeTail()` and applies the requested size with tolerance and per-dashboard min/max bounds.

This allows dashboards to grow and shrink as content changes. Future tabbed dashboards use the same mechanism, so changing tabs may request a different content size without introducing Netscript calls inside React.

Position and requested size are clamped to the viewport. Height is additionally bounded by the usable space below the tail's current top edge; when rendered content exceeds that bound, Bitburner's native content viewport remains the scrolling surface instead of allowing the tail to grow beyond the visible screen. r25/r26 calibration established that `resizeTail()` maps exactly to `.react-resizable`, while Bitburner's intermediate log/content viewport uses a scrollable `flex-direction: column-reverse` layout. The shared helper therefore discovers that viewport structurally, measures native overhead as the resizable dimensions minus the viewport client dimensions, and requests rendered content size plus that measured overhead. No generated MUI class name or fixed chrome-height constant is used. ResizeObserver-driven remeasurement plus main-loop tolerance lets the tail converge after content/tab changes. Dashboard-specific min/max profiles provide only bounds. Presentation memory remains best-effort and must never block dashboard startup. The React/Netscript ownership rule remains unchanged.

After every successful deployment, dashboard presentation processes are explicitly refreshed: the old native tails are closed before their processes are killed, then the dashboards are relaunched from the newly deployed files. This refresh does not by itself restart unchanged telemetry/core services. Future orchestration may replace the explicit dashboard list with a registry, but the lifecycle contract remains presentation refresh independent of service restart.

## Shared dashboard layout coordination

`dashboard-layout-coordinator.js` coordinates presentation geometry without making dashboards directly inspect or control one another. Active dashboards publish a short-lived browser-local geometry record (stable ID, order, position, size, heartbeat). Entries expire when a dashboard stops reporting so closed windows do not reserve stack space.

The current `operations` group uses a 6px gap and exactly one active anchor. The anchor's position remains user-controlled and persistent. Followers dock to a persisted `top`, `bottom`, `left`, or `right` side; members sharing a side stack by configured order. Dragging a follower materially away from its commanded position temporarily releases coordination, and after the native drag settles the nearest normalized anchor side is selected and the follower snaps to that side. Dynamic size changes reflow the docked layout automatically. Changing the anchor preserves the physical relationship where possible by inverting the previous side.

Each dashboard exposes the shared compact `Anchor` control. Selecting it transfers anchor ownership for the group. Current ordering is Update Watcher 10 and System Health 20; ordering is generic so later dashboards can join without pair-specific positioning code.

Layout registry and anchor choice are browser-local presentation state, not telemetry or canonical game state. React/browser code may publish geometry and calculate desired placement, but only each dashboard's Netscript `main()` loop calls `ns.ui.moveTail()` / `ns.ui.resizeTail()`.

## M1 update dashboard slice

`update-dashboard.jsx` is the first narrow dashboard slice. Its production-facing view is intentionally minimal rather than diagnostic.

It displays only:
- the locally committed current version/revision
- watcher heartbeat age / online state
- the watcher polling interval
- an approval message and controls when a newer revision is presented
- explicit installation state: in progress, clean completion, degraded completion, or failure
- concise command/error feedback when needed

The compact completion indicator is derived from the watcher's existing deployment observation/report; the dashboard does not create a second deployment-status authority. A terminal clean report replaces stale transient command text such as `Installing rN.` with a green `Install clean` state and the completed revision. Degraded or failed terminal reports remain visibly red.

Detailed discovery, runtime-unit, and validation telemetry remains in structured runtime files for future Validation Dashboard surfaces; it is not shown in this compact operator widget.

It reads:
- `data/update-status.json` — watcher heartbeat, local release identity, presented revision, polling interval, command result, and errors

It writes only:
- `data/update-command.json` — a bounded single-slot `approve` or `decline` command for the exact presented revision

The dashboard never calls `git-pull.js` directly. `src/bootstrap/update-watcher.js` owns command validation and delegates approved execution to the puller.

The Update Watcher status row is also the dashboard's intrinsic width probe. Its nowrap child widths, padding, and gaps determine the requested content width, allowing the tail to grow when Install/Later controls appear and shrink back when they disappear; the normal compact width remains the minimum. The shared window helper observes React content mutations as well as box resizes, because adding/removing controls can change intrinsic width without changing the currently constrained DOM box. A content mutation therefore schedules a fresh measurement and native `resizeTail` request.

### Lifecycle ownership

During M1, the update dashboard is a managed child of the persistent update watcher. Watcher startup refreshes the dashboard process so the UI code matches the deployed release. Watcher heartbeats relaunch the dashboard if it exits. The dashboard also rejects duplicate manual instances.

Normally start only:

`run src/bootstrap/update-watcher.js`

The watcher opens the dashboard automatically. Manual dashboard launch is only for diagnosis when the watcher is intentionally not running.

### Netscript ownership rule

React components, effects, timers, and button callbacks do not call Netscript APIs. The script `main()` loop is the sole Netscript owner. It reads telemetry, restores window geometry, and writes commands serially. React uses ordinary browser/JavaScript APIs for rendering and window-geometry observation. This avoids Bitburner's concurrent Netscript-call restriction.


## M2 System Health Watcher

`system-health-dashboard.jsx` is the first M2 telemetry consumer. It is a compact alarm/status surface rather than the full Validation Dashboard. It reads the central aggregate health snapshot and bounded incident history owned by `health-collector.js`.

The surface shows overall suite health, active stale/degraded/failed services, recent warning/error incidents, and observed service placement (service, host, PID, health). Failure reasons are reduced to their first diagnostic line in this compact surface, with the full telemetry/log diagnostic retained for engineering use. Recent warning/error incidents are operationally deduplicated by service plus incident code by the collector, so repeated stale/failure episodes replace the older matching warning instead of growing duplicate rows. Different incident types remain visible independently. Healthy operation stays intentionally quiet.

The dashboard uses the shared grey-blue visual language and `dashboard-window-memory.js` with the stable key `system-health`. Its height follows current content within defined bounds, so active issues/incidents can grow the tail and recovery can shrink it. React measures content only; the script main loop owns Netscript reads, position restore, and tail resizing.

Desired placement and restart authority do not belong to this dashboard or to M2 telemetry. The future M4 Supervisor will compare intended service placement with this observed runtime information.


## Dashboard geometry calibration

`dashboard-geometry-calibration.jsx` is a temporary/diagnostic presentation harness used to establish the real relationship between `ns.ui.resizeTail()` dimensions and Bitburner's rendered tail DOM. It is not a production dashboard and does not alter the shared sizing policy by itself.

The harness offers known 600×300, 720×420, and 840×540 native tail targets. The Netscript main loop alone applies those exact sizes. r25 established that `resizeTail()` matches `.react-resizable` exactly while the React root's vertical offset changes with target height. r26 therefore enumerates every ancestor from the React root through `.react-resizable`, reporting bounding/client/scroll dimensions, scroll position, display/position/overflow, flex layout properties, and root-relative offsets. Explicit top/bottom content markers separate actual rendered extent from native-container placement.

Use it only for sizing validation. r26 measurements identified the scrollable column-reverse content viewport used by the production sizing helper; the harness remains available for diagnosis if a future Bitburner UI release changes the native tail DOM.
