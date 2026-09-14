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

## Shared window memory

All dashboard tail windows must use `dashboard-window-memory.js` with a stable dashboard-specific key. The helper remembers the native tail window's position and size in browser local storage, restores that geometry after the dashboard opens, and keeps it updated when the player drags or resizes the tail.

Window memory is presentation state only. It is not canonical game/runtime state and must never block a dashboard from opening. Invalid or unavailable memory fails open to Bitburner's normal window geometry. Saved geometry is clamped to the current viewport so a resolution change cannot permanently strand a dashboard off-screen.

React only observes DOM geometry and writes browser-local presentation memory. Netscript UI calls used to restore the window remain owned by the script `main()` path, preserving the no-concurrent-Netscript rule.

## M1 update dashboard slice

`update-dashboard.jsx` is the first narrow dashboard slice. Its production-facing view is intentionally minimal rather than diagnostic.

It displays only:
- the locally committed current version/revision
- watcher heartbeat age / online state
- the watcher polling interval
- an approval message and controls when a newer revision is presented
- concise command/error feedback when needed

Detailed discovery, deployment, runtime-unit, and validation telemetry remains in structured runtime files for future Validation Dashboard surfaces; it is not shown in this compact operator widget.

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
