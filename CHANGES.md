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

### r50 Explicit managed-file retirement and standalone dashboard scrub
**Status:** r50 published — awaiting runtime validation

**Goal:** Add a fail-closed deployment contract for explicitly deprecated managed files, then use it to retire the standalone System Health and Update Watcher dashboard scripts without retiring their persistent backend services.

**Files / areas touched:**
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/bootstrap/update-watcher.js`
- `src/core/health-collector.js`
- deployment r50 manifest/descriptor
- deployment architecture/decision/current-state documentation

**Decisions / constraints:**
- File disappearance is never deletion authorization. Only explicit `retireFiles` entries may scrub files.
- Retirement paths must be previously managed, must not be under protected `data/`, and cannot also be active manifest targets.
- Runtime ownership/relaunch behavior is removed before retirement reconciliation.
- For each retirement path: discover matching processes, close any tail, kill, wait, verify no matching process remains, then delete, then verify absence. If stop verification fails, preserve the file and mark deployment degraded.
- Every retirement action is printed individually and persisted in `data/git-pull-report.json`: already absent, stopped PIDs, verified stopped, deleted, verified absent, or blocked/failure reason.
- Retirements are one-release instructions; immutable release metadata/report provide durable audit history.
- r50 retires only `src/ui/system-health-dashboard.jsx` and `src/ui/update-dashboard.jsx`. `health-collector.js` and `update-watcher.js` remain persistent backend services. Validation Dashboard remains the UI.
- No M3 canonical-state runtime work is mixed into this deployment hygiene release.

**Validation:** Static repository review confirms both backend owners contain zero references to the retired standalone dashboard paths/relaunch helpers; puller/helper source has balanced structural braces; r50 manifest removes both UI files from active files/runtime dependencies and explicitly lists both under `retireFiles`; retirement reconciliation is ordered after persistent runtime reconciliation and blocks deletion while any matching process remains. Immutable r50 releaseRef is `8e679fa2c3e9f8bd02ba9215a09793a01be1a980`; descriptor publication was last. Runtime deployment remains pending. Acceptance requires both old dashboard tails/processes closed, both files absent from home, backend Health Collector/Update Watcher still healthy, Validation Dashboard healthy, and retirement print/report evidence naming both files.

**Next step:** Install r50 through the integrated Validation Dashboard updater. Verify the retirement audit names both obsolete UI files, both old standalone UI processes are gone, the files are absent, and all seven reporting services return healthy.

## Recently completed

### M2 Telemetry / Dashboard Foundation
**Status:** Complete and runtime validated through v0.5.0-r49

M2 established structured service telemetry/events, aggregate health and incident handling, isolated observation producers, shared dashboard presentation infrastructure, the Validation Dashboard engineering hub, registered SAFE/DISRUPTIVE tests, durable evidence provenance, and emergency focus/recovery behavior. Final controlled validation crossed the real 4-of-7 emergency threshold, focused Health once, required acknowledgement, restored all four stopped collectors, and returned the stack to 7/7 healthy.



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
