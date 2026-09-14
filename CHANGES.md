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

### M1 explicit persistent-unit retirement design
**Status:** Design

**Goal:** Complete the last deployment-lifecycle capability required before M1 can close: an explicit, fail-closed way for a release manifest to authorize retirement of a previously persistent runtime unit.

**Files / areas touched:**
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/README.md`
- `DECISIONS.md` if the retirement contract introduces a durable schema/lifecycle decision
- `CURRENT_STATE.md`
- release manifest(s) used for validation

**Decisions / constraints:**
- Final normal r17 deployment succeeded after the concurrent-validation helper was removed; local deployment advanced successfully and the updater returned healthy.
- Exact-revision stale approval and duplicate/concurrent deployment rejection are both runtime validated.
- Full rollback is deferred as future hardening: M1 already stages and validates before activation and specifically protects running persistent services from failed/partial updates; a broader transactional rollback layer can be designed later without weakening current M1 guarantees.
- Per-file cryptographic hashes are deferred as defense in depth because production bytes are already pinned to an immutable Git commit SHA through `releaseRef`.
- Explicit persistent-unit retirement remains an M1 blocker because project rules explicitly forbid treating disappearance from a manifest as authorization to terminate a persistent unit. Without a positive retirement contract, future releases cannot safely remove persistent services.
- Retirement must remain explicit, staged/validated, attributable to the new manifest, and processed in controlled runtime order. Manifest absence alone must continue to do nothing.

**Validation:** r17 installed normally after all approval/concurrency tests, confirming the production deployment path still works after the validation exercises. No runtime defect was reported.

**Next step:** Design the manifest retirement schema and helper reconciliation behavior, including validation and a controlled runtime test, before implementation.

## Recently completed

### M1 deployment close-out validation through r17
**Status:** Runtime validated

The temporary concurrent-validation helper was confirmed gone and r17 was then installed through the normal dashboard approval path. The deployment completed correctly, providing final confirmation that the ordinary watcher → puller → helper → runtime-reconciliation path remained healthy after the stale-approval and concurrency rejection tests.

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
