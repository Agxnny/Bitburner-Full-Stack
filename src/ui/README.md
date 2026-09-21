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

Position and requested size are clamped to the viewport. Presentation memory remains best-effort and must never block dashboard startup. The React/Netscript ownership rule remains unchanged.

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

### Lifecycle ownership

During M1, the update dashboard is a managed child of the persistent update watcher. Watcher startup refreshes the dashboard process so the UI code matches the deployed release. Watcher heartbeats relaunch the dashboard if it exits. The dashboard also rejects duplicate manual instances.

Normally start only:

`run src/bootstrap/update-watcher.js`

The watcher opens the dashboard automatically. Manual dashboard launch is only for diagnosis when the watcher is intentionally not running.

### Netscript ownership rule

React components, effects, timers, and button callbacks do not call Netscript APIs. The script `main()` loop is the sole Netscript owner. It reads telemetry, restores window geometry, and writes commands serially. React uses ordinary browser/JavaScript APIs for rendering and window-geometry observation. This avoids Bitburner's concurrent Netscript-call restriction.


## M2 System Health Watcher

`system-health-dashboard.jsx` is the first M2 telemetry consumer. It is a compact alarm/status surface rather than the full Validation Dashboard. It reads the central aggregate health snapshot and bounded incident history owned by `health-collector.js`.

The surface shows overall suite health, active stale/degraded/failed services, recent warning/error incidents, and observed service placement (service, host, PID, health). Healthy operation stays intentionally quiet.

The dashboard uses the shared grey-blue visual language and `dashboard-window-memory.js` with the stable key `system-health`. Its height follows current content within defined bounds, so active issues/incidents can grow the tail and recovery can shrink it. React measures content only; the script main loop owns Netscript reads, position restore, and tail resizing.

Desired placement and restart authority do not belong to this dashboard or to M2 telemetry. The future M4 Supervisor will compare intended service placement with this observed runtime information.
