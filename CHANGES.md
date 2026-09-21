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

### M1 update-dashboard deployment completion status
**Status:** Runtime validation — r20 published

**Goal:** Make the ultra-compact update watcher clearly show when an installation has finished and whether the committed deployment was clean, instead of leaving transient `Installing rN.` feedback visible after completion.

**Files / areas touched:**
- `src/ui/update-dashboard.jsx`
- `src/ui/README.md`
- `deployment/releases/r20-manifest.json`
- `deployment/version.json`
- `CURRENT_STATE.md`

**Decisions / constraints:**
- Reuse the watcher's existing canonical deployment observation/report; do not create a second deployment-status authority.
- The dashboard derives operator states from deployment report status, `success`, `clean`, finished revision, and whether deployment infrastructure is still running.
- Successful completion is explicit and green; degraded/failed completion is explicit and red; active deployment remains an in-progress state.
- Transient command feedback must not override a terminal deployment result.
- Preserve the approved ultra-compact grey-blue visual language, React/Netscript ownership boundary, and dashboard geometry memory.

**Validation:** r19 retirement validation passed: after normal r19 installation, `src/bootstrap/validation/retirement-fixture.js` was gone while `src/bootstrap/update-watcher.js` and its dashboard remained running. The dashboard completion indicator is implemented and documented. r20 is published with immutable releaseRef `0ec3e741e2f61eff860fdaf2b282a0c9a7df9f63`; runtime UI behavior remains to be validated.

**Next step:** Install r20 normally from the update dashboard. Confirm the UI transitions through installation and then settles on a green `Install clean` indicator with `Last installation completed successfully (r20).` rather than retaining stale `Installing r20.` feedback.

## Recently completed

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
