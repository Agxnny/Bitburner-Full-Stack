# Decisions

This file records durable architectural decisions. Revisit a locked decision only for a concrete technical reason and record the change rather than silently rewriting history.

## D-001 — Centralized control plane
**Status:** Locked

Use centralized state, resource/authority/budget management, scheduling, and execution instead of independent scripts competing for resources.

## D-002 — Thin supervisor
**Status:** Locked

The main daemon/supervisor manages service lifecycle and health. Domain strategy lives in independent modules/services.

## D-003 — Single canonical state
**Status:** Locked

Shared player/game/resource state has one canonical owner. Modules consume it through interfaces and may not create competing sources of truth.

## D-004 — Shared authority and budget model
**Status:** Locked

RAM, money, stock symbols, targets, player work, sleeves, and other contested resources/domains use the common Resource, Authority & Budget Manager rather than bespoke ownership systems.

## D-005 — Separate decision from execution
**Status:** Locked

Controllers own intent/strategy; designated executors perform side effects. Example: stock manipulation may own symbol authority while the trader remains the sole trade executor.

## D-006 — React dashboards are first-class
**Status:** Locked

Maintain a Production Dashboard for operations and a Validation Dashboard for correctness/health. Validation UI evolves alongside core systems and is part of completion criteria.

## D-007 — Updater is bootstrap infrastructure
**Status:** Locked

Git sync/update tooling remains recoverable and partly independent of the control plane so it can update or recover the control plane itself.

## D-008 — Manifest controls persistent runtime updates
**Status:** Locked

Persistence is declared at runtime-unit level. Persistent units are restarted only after explicit manifest change/retirement plus successful staged validation.

## D-009 — Repository is project memory
**Status:** Locked

Code, current state, decisions, fixes, rules, references, and handoff context live in GitHub. Chat should remain compact and should not carry source-code dumps by default.

## D-010 — Deployment identity uses version plus revision
**Status:** Locked

Deployments expose a semantic version in `vX.Y.Z` form and a monotonically increasing integer revision. Semantic version communicates release meaning; revision is the freshness/update sequence. A revision is immutable once released and may not be reused for different deployable content.

## D-011 — Update approval is always human initiated
**Status:** Locked

The update watcher may detect and present a newer revision but must never automatically pull it. The player explicitly approves or declines the specific revision presented. Approval for one revision does not authorize a newer revision that appears before deployment starts.

## D-012 — Puller self-update uses a post-exit helper
**Status:** Locked

`git-pull.js` never replaces its own running file as part of normal activation. A minimal helper is updated first, launched by the puller, waits for the puller's PID to exit, then cache-busts and downloads the current `git-pull.js` before committing local deployment state. The helper invocation contract remains compatible for manifest schema version 1.

## D-013 — Update watcher owns detection and approval command handling
**Status:** Locked

`src/bootstrap/update-watcher.js` is the persistent owner of remote release detection and update approval command handling. It polls the cache-busted deployment descriptor, publishes structured status under protected runtime data, and never installs automatically.

Dashboard actions write a bounded single-slot update command through the standard command path. On approval, the watcher re-verifies the remote descriptor and only then launches `git-pull.js --expect-revision N`. The puller remains the deployment executor and independently enforces the exact approved revision. Dashboard code may not invoke the puller directly.

## D-014 — Release manifests use immutable revision-specific paths
**Status:** Locked

Every published deployment descriptor must point to a manifest path unique to that immutable revision, for example `deployment/releases/r8-manifest.json`. A mutable shared manifest path must not be used by new release descriptors.

Cache busting prevents reuse of a cached URL response but does not make multiple GitHub Raw files publish atomically. Revision-specific manifest paths ensure that a descriptor observed from one repository propagation state cannot accidentally pair with a manifest from a later release. The puller's descriptor/manifest identity validation remains mandatory and must fail closed on any mismatch.

## D-015 — Post-update helper reconciles persistent runtime units
**Status:** Locked

The deployment manifest declares persistent runtime units and the files that define each unit. `git-pull.js` derives a runtime plan from staged file actions. After the puller exits and self-refresh succeeds, `git-pull-self-update.js` commits the deployment and reconciles those persistent units in explicit restart order.

For each persistent unit: unchanged and running is preserved; unchanged and missing is relaunched; changed and running is stopped then restarted; changed and missing is launched. Runtime reconciliation never substitutes for the future continuous Supervisor. A committed deployment with failed runtime reconciliation is reported as committed-but-degraded instead of pretending the file deployment rolled back.

## D-016 — Update watcher owns the update dashboard lifecycle
**Status:** Locked

During M1, the persistent `src/bootstrap/update-watcher.js` owns exactly one managed `src/ui/update-dashboard.jsx` child. Watcher startup refreshes the dashboard process so deployed UI code is current, and watcher heartbeats relaunch the child if it stops. The dashboard is not independently declared as a persistent runtime unit.

When the general Supervisor is implemented, persistent-service liveness ownership may move there, but the update watcher remains the semantic owner of update detection/approval and the dashboard remains a managed client rather than a deployment executor.

## D-017 — Release discovery is redundant; release content is commit-pinned
**Status:** Locked

`deployment/version.json` remains the small mutable discovery pointer, but no single GitHub Raw branch view is trusted as the only freshness source. The watcher compares a 30-second cache-busted Raw view with a lower-frequency unauthenticated GitHub Contents API view and selects the highest valid revision. Approval forces a fresh API check. The puller independently performs both discovery checks before enforcing `--expect-revision`.

GitHub API polling is deliberately slower than Raw polling to stay below the unauthenticated public API limit and leave headroom for approval/deployment checks. Discovery-source health and the selected source are visible in update telemetry.

Every production descriptor from the transition release onward includes an immutable 40-character Git commit SHA in `releaseRef`. After the descriptor is discovered, the manifest and all manifest sources are fetched from that exact commit rather than mutable `main`. The self-update helper also refreshes `git-pull.js` from the same immutable release content before committing deployment state.

Release r12 is the one-time compatibility bridge because the r11 puller cannot interpret `releaseRef`. Its manifest points to revision-unique source snapshots under `deployment/releases/r12-src/`, allowing the old puller to stage immutable-by-path transition content. The r12 helper permits that narrowly scoped fallback only for revision 12. Later releases must use `releaseRef`; unpinned self-refresh fails closed.

## D-018 — Dashboards share one grey-blue visual language
**Status:** Locked

All React dashboard surfaces use a common dark grey-blue presentation system so operator and validation UIs feel like one product. The base language uses near-black/charcoal backgrounds, blue-grey raised surfaces, cool blue borders/dividers, bright blue primary actions, pale blue-grey secondary text, green healthy state, amber attention/update state, and red only for explicit failures.

The M1 update watcher uses the approved ultra-compact single-row presentation: current release, heartbeat, polling interval, and update approval only. Detailed engineering telemetry remains available to validation surfaces rather than crowding this operator widget.

The later Production Dashboard should use the same palette but may use larger status-card compositions similar to the approved compact status-card concept. Visual consistency is shared; layout density is allowed to vary by dashboard purpose.

## D-019 — Dashboard tail geometry is persistent presentation memory
**Status:** Locked

Every dashboard tail uses the shared `src/ui/dashboard-window-memory.js` helper with a stable dashboard-specific key. The helper remembers the player's last window position and size, restores that geometry when the dashboard is reopened or relaunched, and continuously updates memory when the native Bitburner tail is dragged or resized.

Geometry is browser-local presentation state, not canonical runtime state. Failure to read, write, or apply saved geometry must never prevent a dashboard from opening. Restored values are clamped to the current viewport to prevent resolution changes from leaving a dashboard unreachable.

React may observe DOM geometry and write browser-local presentation memory because those are ordinary browser APIs. Netscript UI calls such as `ns.ui.moveTail()` and `ns.ui.resizeTail()` remain owned by the script `main()` path, preserving the no-concurrent-Netscript invariant from FIX-002.


## D-020 — Operational telemetry has one aggregate health owner
**Status:** Locked

M2 operational telemetry uses a shared producer contract and one central `health-collector` on `home` as the owner of aggregate service health and bounded incident storage. Producers report stable service identity plus per-process instance ID, observed hostname/PID, lifecycle, heartbeat/freshness, health, phase, and reason through a host-independent transport.

Observed runtime placement is telemetry, not lifecycle authority. The future M4 Supervisor owns desired placement, launches, restarts, duplicate/orphan reconciliation, and startup ordering. M2 health collection may mark missing heartbeats stale but may not independently relocate or restart general services.

Telemetry is also distinct from M3 canonical game state: operational health/events describe the automation system; observed player/server/game facts belong to the canonical state owner.


## D-021 — Dashboard position is persistent; size is content-owned
**Status:** Locked

Dashboard position remains a browser-local user preference and is restored by stable dashboard key. Dashboard size is no longer persisted or restored from manual user resizing.

Each dashboard owns its runtime size. React may measure rendered content using ordinary DOM APIs and publish a debounced desired size through its in-memory bridge. Only the dashboard `main()` path may call Netscript UI resize/move APIs. Per-dashboard min/max bounds, viewport clamping, and resize tolerance prevent unusable geometry and resize jitter.

This contract applies to current dashboards and future tabbed dashboards: content or tab changes may dynamically grow or shrink the native tail while preserving the user's chosen screen position.


## D-022 — Dynamic dashboard size derives from the measured native content viewport
**Status:** Locked

Calibration in r25/r26 established that `ns.ui.resizeTail()` maps to the native `.react-resizable` dimensions, while Bitburner's intermediate log/content viewport is a scrollable flex column-reverse container whose placement caused the apparent black-gap/clipping behavior.

Production sizing must discover that content viewport structurally from the dashboard root-to-resizable ancestor chain rather than depending on generated MUI class names. Native overhead is measured at runtime as resizable dimensions minus content-viewport client dimensions; requested native size is rendered dashboard content plus that measured overhead, subject to dashboard bounds and viewport clamping.

Resize observation and main-loop tolerance provide convergence after content or tab changes. Fixed guessed chrome offsets are not part of the production sizing contract.
