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
**Status:** Validation procedure ready

**Goal:** Prove that a second approval/deployment attempt cannot start while deployment infrastructure is already running or finalizing.

**Files / areas touched:**
- `src/bootstrap/update-watcher.js` only if validation exposes a defect
- `src/bootstrap/git-pull-self-update.js` as the existing deployment-infrastructure sentinel used by the controlled test
- `deployment/README.md`
- `CURRENT_STATE.md`
- `FIXES.md` if a reusable defect is found

**Decisions / constraints:**
- Preserve the existing single-deployment authority boundary.
- Use the production watcher command path rather than bypassing it.
- Do not modify runtime code unless the test fails.
- r17 remains the pending approved target for this test.
- The controlled test launches the existing self-update helper in a harmless wait state against the live watcher PID. While the watcher remains running, that helper only sleeps on `ns.isRunning(waitPid)` and therefore performs no deployment-state mutation.
- While the helper is present, approving r17 through the dashboard must be rejected with `A deployment is already running or finalizing.` and must not launch `git-pull.js`.
- Kill the validation helper immediately after observing the rejection so it can never progress past its wait loop.

**Validation:** Exact-revision stale approval is runtime validated. Duplicate/concurrent deployment rejection remains unproven.

**Next step:** Run `src/bootstrap/git-pull-self-update.js` with `--wait-pid` set to the live watcher PID and `--revision 17`, confirm the helper is running, click Install for r17, verify rejection/no puller launch, then kill the validation helper.

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
