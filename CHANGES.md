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

### M1 duplicate/concurrent deployment validation
**Status:** Validation design

**Goal:** Prove that a second approval/deployment attempt cannot start while deployment infrastructure is already running or finalizing.

**Files / areas touched:**
- `src/bootstrap/update-watcher.js` only if validation exposes a defect
- `deployment/README.md`
- `CURRENT_STATE.md`
- `FIXES.md` if a reusable defect is found

**Decisions / constraints:**
- Preserve the existing single-deployment authority boundary.
- Use the production watcher command path rather than bypassing it.
- Do not modify runtime code unless the test fails.
- r17 remains unapproved until the concurrent-deployment test procedure is ready.

**Validation:** Exact-revision stale approval is now runtime validated. With local runtime on r15 and r17 presented, a deliberately stale approval for r16 was rejected with `Approved revision is no longer the current newer release.` The dashboard continued to present r17 and did not implicitly authorize it.

**Next step:** Design the controlled duplicate/concurrent deployment test so one deployment remains observably active long enough to submit a second approval attempt safely.

## Recently completed

### M1 stale/mismatched approval validation
**Status:** Runtime validated

Controlled no-op releases r16 and r17 proved exact-revision approval semantics. r16 was first presented while local runtime remained on r15; r17 was then published and presented. A manually submitted approval explicitly bound to stale r16 was rejected after fresh verification with `Approved revision is no longer the current newer release.` r17 remained awaiting its own approval, proving that approval of one revision cannot silently authorize a newer revision.

### Documentation durability and feature-doc synchronization
**Status:** Complete

Added `CHANGES.md` as the required lightweight in-progress work record. `PROJECT_RULES.md` now requires it to be updated during meaningful implementation work and before handoffs/context switches. Feature/subsystem documentation must now be updated in the same work item whenever feature behavior, interfaces, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes. Startup and current-state documentation were updated to include the new workflow.

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
