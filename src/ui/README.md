# UI

React dashboard code and shared presentation components.

Planned surfaces:
- Production Dashboard: live operational behavior and resource usage.
- Validation Dashboard: correctness, health, freshness, reconciliation, invariants, and diagnostics.

UI code consumes structured telemetry and sends commands through standard control interfaces; it is not a source of truth.

## M1 update dashboard slice

`update-dashboard.jsx` is the first narrow dashboard slice. It exists to validate the dashboard architecture while M1 Reliable Deployment is active.

It reads:
- `data/update-status.json` — watcher health, heartbeat, local/remote release state, presented revision, command result, and deployment observation
- `data/git-pull-report.json` — detailed deployment outcome fallback

It writes only:
- `data/update-command.json` — a bounded single-slot `approve` or `decline` command for the exact presented revision

The dashboard never calls `git-pull.js` directly. `src/bootstrap/update-watcher.js` owns command validation and delegates approved execution to the puller.

Run on `home` after the watcher is started:

`run src/ui/update-dashboard.jsx`
