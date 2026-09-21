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

### r41 incident expiry + whole-second Health freshness
**Status:** r41 installed — runtime PASS

**Goal:** Automatically remove old retained warning/error incidents and make System Health's "updated … ago" presentation use whole seconds only.

**Files / areas touched:**
- `src/core/health-collector.js`
- `src/ui/system-health-dashboard.jsx`
- `src/core/README.md`
- deployment r41 metadata

**Decisions / constraints:**
- Retained warning/error incidents expire after 10 minutes from their incident timestamp. Active service health is independent and remains visible even if its historical incident ages out.
- Expiry applies on collector startup and continuously during the collector loop, so old persisted incidents disappear without requiring a new incident.
- Existing unique identity rule (service + incident code) remains: newer occurrences replace older occurrences.
- Recovery/info bounded-history behavior remains unchanged.
- System Health freshness display floors to whole seconds; values below one second display `0s`, never milliseconds.
- Do not alter process uptime, collector behavior, updater sizing, or dashboard geometry.

**Validation:** r40 process uptime is runtime PASS. Static r41 implementation adds a 10-minute TTL only to retained warning/error incidents, prunes on startup and continuously, and leaves active health/recovery history independent. System Health freshness now floors to whole seconds (`0s` below one second) and never renders milliseconds. Runtime validation PASS: after r41 installation, the expired infrastructure/update-watcher warning rows are gone, all seven services remain HEALTHY, System Health freshness displays whole seconds (`updated 1s ago`), and producer-owned uptime is preserved for unchanged collectors/update-watcher while the changed Health Collector correctly restarted. r41 immutable manifest published at releaseRef `ea2a0b728194f3868edbc9796a499c5735bfb02c`; descriptor published last. Existing historical infrastructure/update-watcher warnings provide direct expiry validation.

**Next step:** r41 health cleanup is complete. Proceed to the next M2 closeout item / milestone review before beginning M3 canonical state.

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
