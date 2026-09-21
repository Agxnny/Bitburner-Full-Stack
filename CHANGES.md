# Working Changes

This file is the repository's lightweight in-progress change log. Its purpose is to preserve work-in-progress context between commits, chats, and handoffs so partially completed changes are not lost.

`CHANGES.md` is not a replacement for `CURRENT_STATE.md`, `DECISIONS.md`, `FIXES.md`, or feature documentation. It is the short-lived working record of what is being changed right now.

## Required workflow

Before the first repository mutation for a new feature, fix, or meaningful change, create or refresh the **Active change** entry below.

Update the active entry after meaningful implementation steps, before switching tasks, before ending a development session, and before handing runtime validation to the operator.

At minimum record:
- **Goal** — what this change is intended to accomplish.
- **Status** — concise current state, such as design, implementation, validation, blocked, or complete.
- **Files / areas touched** — the important repository surfaces involved.
- **Decisions / constraints** — only the details needed to resume safely.
- **Validation** — what has been checked and what is still unproven.
- **Next step** — the exact next action.
- **Blockers / risks** — only when applicable.

When the change is complete, move a concise summary to **Recently completed** and replace the active entry with the next real change. Do not maintain a verbose lifecycle history here; durable architectural decisions belong in `DECISIONS.md`, reusable incidents in `FIXES.md`, and milestone handoff state in `CURRENT_STATE.md`.

## Active change

### r37 System Health current-instance uptime
**Status:** r37 presented — r36 action-state sizing FAIL; do not install yet

**Goal:** Show how long each currently reporting service instance has been continuously observed, making restarts/replacements visible in Service Placement without adding Netscript calls to React.

**Files / areas touched:**
- `src/core/health-collector.js`
- `src/ui/system-health-dashboard.jsx`
- `src/core/README.md`
- deployment r37 metadata

**Decisions / constraints:**
- Uptime means current telemetry instance lifetime as observed by Health Collector, not historical service lifetime.
- Health Collector records `observedSince` on first sight of an instance and preserves it across later heartbeats for that same instance.
- Replacement instance/PID receives a new `observedSince`, so displayed uptime resets naturally.
- React derives the live duration from snapshot `observedSince` using ordinary JS time only; it does not invoke Netscript or force per-second health snapshot writes.
- r36 compact Update Watcher root-measured sizing is PASS. Publishing r37 also provides the pending r36 action-state Install/Later sizing test before installation.

**Validation:** Current runtime shows all seven persistent reporting services healthy. Static implementation complete: Health Collector preserves `observedSince` for the same instance ID and resets it on replacement; snapshot exposes it; Service Placement renders live compact uptime using ordinary JS time. Producer telemetry schema and React/Netscript ownership are unchanged. Runtime validation: r36 compact root-measured sizing PASS, but with r37 presented the action state FAILS: the right-side Install/Later controls are clipped and the native tail does not expand. This demonstrates that complete-root measurement is reliable for the compact state but cannot discover hidden intrinsic width once the nowrap action row is constrained by the existing native viewport. r37 uptime itself remains uninstalled/unvalidated. r37 immutable manifest published at releaseRef `b74e8bbb3892647b1930641fdd8037b1d25dce43`; descriptor published last.

**Next step:** Do not install r37 yet. Compact root-measured sizing passes, but the r36 action state clips the Install/Later controls because the rendered root is itself constrained by the current native width: `root.scrollWidth` does not expose the nowrap row's hidden intrinsic demand. Keep root sizing for compact state, but introduce an explicit two-state updater width contract (compact vs action) rather than restoring the synthetic child-width probe. Publish a superseding revision containing the sizing correction plus the r37 uptime feature, then re-test action state before installation.

## Recently completed

### r20 update-dashboard deployment completion status
**Status:** Runtime validated

Normal r20 installation completed successfully and the dashboard transitioned from install progress to a green `Install clean` terminal state with the completed revision. This validates that transient command feedback no longer leaves the operator uncertain whether deployment finished cleanly.


### M1 explicit persistent-unit retirement
**Status:** Runtime validated

r18 introduced the retirement-aware puller/helper and launched the harmless persistent retirement fixture alongside the update watcher. r19 then explicitly retired only that fixture. Runtime `ps home` after r19 showed the watcher and dashboard still healthy while the fixture was gone, validating positive manifest-authorized persistent-unit retirement.


### M1 deployment reliability validation through r17
**Status:** Runtime validated

Controlled r16/r17 testing proved stale approval rejection and single-deployment concurrency protection. After the temporary validation helper was stopped, the normal r17 installation also completed successfully, confirming the ordinary deployment path remained healthy after both rejection tests.

### M1 duplicate/concurrent deployment validation
**Status:** Runtime validated

The existing self-update helper was launched in a harmless wait state against the live watcher PID so it counted as active deployment infrastructure without progressing into deployment mutation. An r17 approval through the normal dashboard path was rejected while that helper was active, confirming the single-deployment guard prevents concurrent deployment startup.

### M1 stale/mismatched approval validation
**Status:** Runtime validated

Controlled no-op releases r16 and r17 proved exact-revision approval semantics. r16 was first presented while local runtime remained on r15; r17 was then published and presented. A manually submitted approval explicitly bound to stale r16 was rejected after fresh verification with `Approved revision is no longer the current newer release.` r17 remained awaiting its own approval, proving that approval of one revision cannot silently authorize a newer revision.

### Documentation durability and feature-doc synchronization
**Status:** Complete

Added `CHANGES.md` as the required lightweight in-progress work record. `PROJECT_RULES.md` now requires it to be updated during meaningful implementation work and before handoffs/context switches. Feature/subsystem documentation must now be updated in the same work item whenever feature behavior, interfaces, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes. Startup and current-state documentation were updated to include the new workflow.

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
