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

### M1 explicit persistent-unit retirement
**Status:** Runtime validation setup — r18 ready to publish

**Goal:** Add and runtime-validate an explicit retirement contract for persistent runtime units so a service is stopped only when a newer validated manifest positively authorizes retirement.

**Files / areas touched:**
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/validation/retirement-fixture.js`
- `deployment/README.md`
- `deployment/releases/r18-manifest.json`
- `deployment/releases/r19-manifest.json` after r18 validation
- `deployment/version.json`
- `CURRENT_STATE.md`

**Decisions / constraints:**
- Manifest schema remains version 1; retirement is the additive optional `retireRuntimeUnits` array of persistent unit IDs.
- A retirement ID must exist in the previously committed `runtimeUnits` ledger and must not also appear in the new manifest's active `runtimeUnits`.
- Retirement reuses the previously committed unit invocation metadata, so the retiring release does not need to redeploy the retired script merely to stop it.
- The puller validates retirement only after release metadata and files are staged; disappearance alone remains non-authoritative.
- The helper stops matching retired processes, verifies they are gone, never relaunches them, reports `retired`/`already-stopped`, and excludes them from the newly committed runtime ledger.
- r18 introduces a harmless persistent `retirement-validation-fixture`; r19 will explicitly retire it. The real update watcher remains an active persistent unit throughout.
- No unrelated deployment refactor or schema redesign.

**Validation:** Source implementation and feature documentation are updated. `deployment/releases/r18-manifest.json` contains the retirement-aware puller/helper plus the harmless validation fixture and declares both the fixture and update watcher as persistent units. Runtime behavior is not yet proven.

**Next step:** Publish r18 by updating `deployment/version.json` last with releaseRef `5f4732259ae57d2addaf56bcfa481992462e93fe`. After r18 is presented, install it normally and verify `src/bootstrap/validation/retirement-fixture.js` and the update watcher are both running before publishing r19.

## Recently completed

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
