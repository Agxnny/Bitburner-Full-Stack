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

### Health incident uniqueness + r30 updater-width validation
**Status:** Published as v0.5.0-r30 — runtime validation pending

**Goal:** Keep the System Health Watcher focused on the latest meaningful warning/error for each service incident type instead of accumulating repeated copies across repeated stale/failure episodes, while using r30 presentation to validate the pending Update Watcher grow/shrink behavior.

**Files / areas touched:**
- `src/core/health-collector.js`
- `src/core/README.md`
- `src/ui/README.md`
- deployment r30 release metadata

**Decisions / constraints:**
- Incident identity for warning/error retention is stable service + incident code. A newer occurrence replaces the older retained occurrence of the same identity.
- Different incident codes for the same service remain independently visible; different services never deduplicate one another.
- Recovery/info records remain bounded history and do not become active warnings.
- This changes retained operational incident presentation only; it does not create canonical game state or Supervisor authority.
- Existing incident files are normalized through the same retention rule when the collector starts, so historical duplicate warnings do not survive indefinitely.
- r29 four-side docking/anchor behavior is runtime PASS. Update Watcher update-available grow/shrink remains pending and will be exercised when r30 is presented.

**Validation:** Static review complete. Collector now upserts warning/error retention by service + code and normalizes the existing incident file through the same rule at startup. Feature docs updated. r30 immutable manifest published at releaseRef `10ba4de7df78966cc40794d80c043df83f6db688`; descriptor published last. Runtime validation remains pending.

**Next step:** Before installing r30, capture the Update Watcher with r30 available to validate update-control width growth. Install r30 normally, confirm it shrinks afterward, then exercise stale → recovery → stale and verify Recent Incidents retains only the newest `update-watcher / SERVICE_STALE` warning.

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
