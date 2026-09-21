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

### r45 Quiet validation runners and durable evidence
**Status:** Implementation complete — preparing r45 runtime validation

**Goal:** Complete the first Tests workflow refinement: dashboard-owned automated tests run quietly, while automated and operator-confirmed validation evidence is durably recorded and visible from Tests/Validated rather than relying on terminal/tail output or chat history.

**Files / areas touched:**
- `src/ui/validation-dashboard.jsx`, `src/ui/validation-tests-tab.jsx`, `src/ui/validation-work-tab.jsx`
- `src/validation/test-registry.js` and validation evidence helpers
- `src/validation/tests/dashboard-smoke-test.js`
- deployment r45 metadata and Validation Dashboard documentation

**Decisions / constraints:**
- Tests remains the sole normal operator surface for validation execution/results; test runner logs are suppressed unless a future explicit debug workflow requests them.
- Test execution remains registry-controlled and fail-closed; no arbitrary scripts/arguments.
- Automated results and operator-confirmed observations share a bounded validation evidence store, but evidence kind remains explicit.
- Manual confirmation records what the operator observed; it does not pretend the system automatically asserted visual/navigation behavior.
- Existing r44 updater-notification evidence may be recorded through the new manual-confirmation workflow after r45 installation.
- No updater convergence fix is mixed into r45.

**Validation:** r44 proved the full dashboard-run smoke path with nine passing assertions, but exposed runner tail/log noise. r44 also proved genuine updater notification without focus stealing and integrated installation. r45 now suppresses runner Netscript logging, records automated results into a bounded durable evidence store, and adds explicit operator-confirmed evidence for registry entries marked manual. Static source review complete; runtime validation remains.

**Next step:** Publish r45, then operator installs it through the integrated Updater. Re-run `m2.dashboard.smoke` from Tests and confirm no runner log line appears in the dashboard tail; then use `Confirm Observed Pass` on the updater notification test and verify both automated and operator-confirmed records appear in Recent Evidence.

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
