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

### M1 stale/mismatched approval validation
**Status:** Validation setup

**Goal:** Prove that human approval is bound to one exact revision and can never silently authorize a newer release.

**Files / areas touched:**
- `deployment/releases/r16-manifest.json`
- `deployment/releases/r17-manifest.json` when the second controlled release is published
- `deployment/version.json`
- `deployment/README.md`
- `src/bootstrap/update-watcher.js` only if validation exposes a defect
- `CURRENT_STATE.md`
- `FIXES.md` if a reusable defect is found

**Decisions / constraints:**
- r16 and r17 are controlled no-op releases; runtime source bytes remain unchanged.
- Publish r16 first and wait until the dashboard presents r16.
- Publish r17 before approving r16.
- Submit the stale r16 approval only after r17 is the current remote release.
- Expected behavior: watcher forces fresh verification, rejects approval for r16, and does not launch the puller for r16 or implicitly authorize r17.
- Do not modify runtime code unless the test fails.

**Validation:** Test setup is being published. Existing watcher code already compares the approved revision with a freshly verified remote revision and fails closed on mismatch; runtime proof is still required.

**Next step:** Publish controlled no-op r16, let the dashboard present r16, then publish r17 before approving r16.

## Recently completed

### Documentation durability and feature-doc synchronization
**Status:** Complete

Added `CHANGES.md` as the required lightweight in-progress work record. `PROJECT_RULES.md` now requires it to be updated during meaningful implementation work and before handoffs/context switches. Feature/subsystem documentation must now be updated in the same work item whenever feature behavior, interfaces, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes. Startup and current-state documentation were updated to include the new workflow.

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
