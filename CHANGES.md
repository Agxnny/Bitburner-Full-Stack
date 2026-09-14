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

### M1 deployment close-out validation
**Status:** Validation

**Goal:** Finish the remaining Reliable Deployment validation paths before closing M1.

**Files / areas touched:**
- `src/bootstrap/update-watcher.js`
- `src/bootstrap/git-pull.js`
- `deployment/README.md`
- `FIXES.md`
- `CURRENT_STATE.md`

**Decisions / constraints:**
- Preserve exact-revision human approval semantics.
- Do not begin later automation subsystems until M1 validation is complete.
- Update deployment feature documentation in the same work item as any behavior or validation-procedure change.

**Validation:** Discovery freshness, commit-pinned canonical release content, persistent watcher lifecycle, compact updater UI, and shared dashboard window memory are runtime-validated. Stale/mismatched approval and duplicate/concurrent deployment paths remain to be explicitly tested.

**Next step:** Design and execute the stale/mismatched approval validation case, recording results here and in the deployment feature documentation.

## Recently completed

### Documentation durability and feature-doc synchronization
**Status:** Complete

Added `CHANGES.md` as the required lightweight in-progress work record. `PROJECT_RULES.md` now requires it to be updated during meaningful implementation work and before handoffs/context switches. Feature/subsystem documentation must now be updated in the same work item whenever feature behavior, interfaces, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes. Startup and current-state documentation were updated to include the new workflow.

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
