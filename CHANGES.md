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

### r49 Emergency validation registry hotfix
**Status:** Implementation

**Goal:** Repair the r48 startup crash before any disruptive validation is allowed to run. r48 installed a sparse `TESTS` array entry because the registry edit emitted `},,`; `findTest()` then dereferenced the resulting `undefined` element during Validation Dashboard startup.

**Files / areas touched:**
- `src/validation/test-registry.js`
- deployment r49 metadata

**Decisions / constraints:**
- This is a minimal hotfix. Do not change emergency-test behavior while repairing startup.
- Remove the accidental sparse array entry and make `findTest()` defensively tolerate malformed/sparse registry entries so a future registry defect fails closed instead of crashing the persistent dashboard.
- The r48 disruptive test did not start; no collectors were intentionally stopped by this failure.

**Validation:** Operator runtime on r48 produced `TypeError: Cannot read properties of undefined (reading 'id')` from `findTest()` during `TESTS_RUNNABLE()`. Repository inspection confirms the exact source is the accidental `},,` between `m2.updater.notification` and `m2.dashboard.emergency-focus`.

**Next step:** Fix registry syntax/lookup defensively, publish r49, install it, and verify the Validation Dashboard opens normally before attempting the DISRUPTIVE confirmation flow.

### r48 Controlled emergency-focus validation
**Status:** Superseded by r49 startup hotfix; disruptive runtime test not started

**Goal:** Add the first DISRUPTIVE registered validation test. It must deliberately cross the real dashboard emergency threshold using only disposable M2 observation collectors, prove one-shot Health focus plus acknowledgement, restore every process it stopped, and record machine/operator evidence without terminal use.

**Files / areas touched:**
- `src/validation/test-registry.js`, new emergency-focus runner
- `src/ui/validation-dashboard.jsx`, `src/ui/validation-tests-tab.jsx`
- validation UI-state/evidence files under `data/validation/`
- Validation Dashboard docs/decisions/current state
- deployment r48 metadata

**Decisions / constraints:**
- Test risk is `DISRUPTIVE`; Run Test opens an explicit confirmation panel before execution.
- Targets are exactly four disposable observation collectors: player, network, market, infrastructure. Health Collector, Update Watcher, Validation Dashboard, and capabilities collector are never stopped.
- Four targets are required because the live emergency rule is at least half of 7 reporting services (4 unhealthy). The test does not lower or bypass that production threshold.
- Runner captures exact target script/host/threads/args before mutation and owns restoration. Normal completion, assertion failure, timeout, and script death all attempt restoration. It restarts only processes it stopped.
- Dashboard React records only ordinary UI facts into the in-memory bridge; dashboard `main()` persists those facts. The runner never calls React or UI Netscript APIs.
- Emergency acknowledgement remains operator action. Automated evidence verifies telemetry degradation, dashboard focus-event publication, acknowledgement publication, one-shot behavior, restoration, and final 7/7 health. Actual native-window foreground perception remains operator-observed.
- Recovery clears the previous emergency acknowledgement/focus generation so a later materially separate identical failure can escalate again.
- No updater-convergence work is mixed into r48.

**Validation:** r47 is runtime PASS for quiet Tests, persistent dashboard tail replacement, and explicit automated/operator-confirmed evidence provenance. Official Bitburner v3.0.1 API verification confirms `NS.atExit()` is available for script-death cleanup callbacks. Static r48 review confirms: four fixed collector targets; real 4-of-7 emergency threshold; restoration callback armed before kills; exact process tuples captured; bounded emergency/ack/recovery timeouts; single-flight test dispatch; React only updates bridge UI facts while dashboard main persists them; recovery clears the prior emergency generation. Immutable r48 manifest includes the new emergency runner and all changed validation modules. Immutable releaseRef is `1def3c1a35cfab492ff5d6ad03c0169a65125e55`; descriptor publication was last. Runtime validation is pending.

**Next step:** Publish immutable r48, install through the integrated Updater, then run `m2.dashboard.emergency-focus` only from Tests. Confirm the DISRUPTIVE warning first; during the run acknowledge the emergency after automatic Health focus; then verify restoration and final 7/7 health.

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
