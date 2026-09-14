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

### M1 deployment close-out review
**Status:** Validation review

**Goal:** Finish the remaining Reliable Deployment close-out decisions and final runtime confirmation before marking M1 complete.

**Files / areas touched:**
- `deployment/README.md`
- `CURRENT_STATE.md`
- `FIXES.md`
- `ROADMAP.md` only if milestone completion changes the active milestone
- deployment runtime files only if review identifies a true M1 blocker

**Decisions / constraints:**
- Exact-revision stale approval is runtime validated.
- Duplicate/concurrent deployment rejection is runtime validated.
- Do not add rollback, per-file hashing, or persistent-unit retirement automatically; first decide whether each is an M1 blocker or future hardening.
- r17 remains the current no-op release and can be used for the final normal deployment confirmation after the temporary validation helper is confirmed stopped.
- Do not begin M2 until M1 close-out documentation and final validation are complete.

**Validation:** The controlled concurrent-deployment test was executed with the self-update helper held in its harmless wait loop against the live watcher PID. Approving r17 through the normal dashboard command path was rejected while the helper was active, demonstrating that the watcher blocks a second deployment attempt when deployment infrastructure is already running. No defect was reported.

**Next step:** Confirm the temporary validation helper is no longer running, then review rollback, per-file hashing, and explicit persistent-unit retirement against the M1 completion criteria and perform the final normal r17 deployment if no blocker remains.

## Recently completed

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
