# UI

React dashboard code and shared presentation components.

Planned surfaces:
- Production Dashboard: live operational behavior and resource usage.
- Validation Dashboard: correctness, health, freshness, reconciliation, invariants, and diagnostics.

UI code consumes structured telemetry and sends commands through standard control interfaces; it is not a source of truth.

## M1 update dashboard slice

`update-dashboard.jsx` is the first narrow dashboard slice. It exists to validate the dashboard architecture while M1 Reliable Deployment is active.

It reads:
- `data/update-status.json` — watcher health, heartbeat, local/remote release state, managed-dashboard state, presented revision, command result, and deployment observation
- `data/git-pull-report.json` — detailed deployment and persistent-runtime reconciliation outcome fallback

It writes only:
- `data/update-command.json` — a bounded single-slot `approve` or `decline` command for the exact presented revision

The dashboard never calls `git-pull.js` directly. `src/bootstrap/update-watcher.js` owns command validation and delegates approved execution to the puller.

### Lifecycle ownership

During M1, the update dashboard is a managed child of the persistent update watcher. Watcher startup refreshes the dashboard process so the UI code matches the deployed release. Watcher heartbeats relaunch the dashboard if it exits. The dashboard also rejects duplicate manual instances.

Normally start only:

`run src/bootstrap/update-watcher.js`

The watcher opens the dashboard automatically. Manual dashboard launch is only for diagnosis when the watcher is intentionally not running.

### Netscript ownership rule

React components, effects, timers, and button callbacks do not call Netscript APIs. The script `main()` loop is the sole Netscript owner. It reads telemetry and writes commands serially, while React exchanges snapshots and button intents with `main()` through an ordinary in-memory JavaScript bridge. This avoids Bitburner's concurrent Netscript-call restriction.
