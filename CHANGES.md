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

### r44 Validation Tests workspace
**Status:** r44 published — waiting for pre-install Updater notification evidence

**Goal:** Add a dedicated Tests tab to the Validation Dashboard so approved validation scripts can be launched and observed from the dashboard rather than the terminal. Use r44 itself as the real updater-notification stimulus.

**Files / areas touched:**
- `src/ui/validation-dashboard.jsx`
- new validation test registry/executor/UI modules
- deployment r44 metadata
- `src/ui/README.md`, `DECISIONS.md`, `CURRENT_STATE.md`

**Decisions / constraints:**
- Tests is execution; Validating remains the active acceptance/evidence queue; Validated remains the completed evidence archive.
- React never invokes Netscript. Test buttons submit typed intents through the dashboard bridge; `main()` dispatches only stable registered test IDs.
- No arbitrary script path/arguments are accepted from React. The registry is the allow-list and owns runner script/arguments/risk metadata.
- Test execution is single-flight for the first slice, with bounded result state under `data/validation/`.
- The first registered test is a SAFE dashboard smoke test that validates current r44 shell/telemetry prerequisites. Publishing r44 itself supplies the genuine newer-release condition for the updater notification test; the test framework does not forge updater telemetry.
- Update availability remains ordinary attention: badge only, no automatic navigation.

**Validation:** r43 six-tab rendering/runtime pass is recorded. r44 adds the seventh Tests tab, registry-controlled typed dispatch, and the SAFE `m2.dashboard.smoke` runner. Static review confirms the immutable r44 manifest includes the new UI/registry/runner files; Validation Dashboard runtime dependencies include the Tests UI and registry. Immutable releaseRef is `1e1a56619516fa9e2a203bf26f2fce1afc6bfcdc`; descriptor publication was last. Runtime evidence is still required for the genuine r44 Updater notification badge before installation and Tests execution after installation.

**Next step:** While still on installed r43, wait for Update Watcher to discover published r44 and capture the dashboard on a non-Updater tab showing the Updater unread badge. Do not open Updater before that screenshot. Then open Updater to verify the badge clears while r44 remains pending; only after that install r44.

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
