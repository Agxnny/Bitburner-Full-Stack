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

### M3 Resource Budget Manager — Money first vertical slice
**Status:** Implementation started

**Goal:** Extend the existing Resource Budget Manager with durable logical money allocations plus reservation/settlement/release accounting, without performing any real game purchase.

**Files / areas:** resource-budget contract/service; resource-budget feature docs and D-044 clarification; validation plan/registry/dashboard; new SAFE money-budget validation; immutable deployment manifest.

**Decisions / constraints:** Budget Manager remains the sole durable owner of money allocation and reservation accounting. Money allocation is a logical ceiling, not permission to act on a target and not a game-money lock. Spending executors remain responsible for actual transactions. A reservation immediately reduces the owner's available budget; release returns it; settlement converts it to durable spent accounting. Reservation IDs and command request IDs are idempotent. First slice uses synthetic amounts only and does not spend player money. Reconciliation with canonical player money/manual spending remains required before real production spending is allowed.

**Validation:** Pending. SAFE m3.budgets.money will prove missing-budget fail-closed reservation, durable allocation, bounded reservation, over-budget denial, release/returned capacity, settlement/spent accounting, and clean allocation retirement without changing game money.

**Exact next step:** Implement the money contract/service and SAFE validation, update feature/architecture records, publish immutable r82 after exact source inspection, then run m3.budgets.money. Do not permit real spending yet.

## Recently completed

### M3 Resource Budget Manager — RAM first vertical slice
**Status:** Runtime validated through v0.6.0-r81

SAFE `m3.budgets.ram` passed 8/8 in 4456 ms. It proved missing-budget denial, durable 2.4 GB allocation, over-budget denial before execution lease creation, in-budget scheduler admission, 1.6 GB active usage attribution, automatic capacity return, reuse of returned capacity, and clean allocation release.


### M3 Execution Scheduler — first vertical slice
**Status:** Runtime validated through v0.6.0-r80

The scheduler is proven for bounded Work Order-bound admission, PID/host/RAM attribution, request idempotency, restart recovery without duplicate launch or expiry extension, natural reservation retirement, and a complete real Canonical State → Authority → Work Order → Execution Scheduler → DELEGATED executor → weaken chain. The real-action fixture remains validation-only; no production hacking subsystem/dashboard was introduced.


### M3 real Authority → Work Order → executor integration proof
**Status:** Runtime validated through v0.6.0-r77

The validation-only real hacking fixture passed 8/8 after exercising the complete managed execution chain against one actual weaken. It proved canonical target selection, real server hacking-control authority, bounded Work Order delegation, executor-side DELEGATED authorization without a direct lease, a measurable game side effect, drain-first terminal closure, authority release, and clean fixture retirement. No production hacking service or dashboard was introduced.


### M3 canonical state + validation lifecycle first slice
**Status:** Runtime validated through v0.6.0-r55

r55 SAFE validation passed the canonical service and all five domains using bounded exact-timestamp convergence, positive revisions, canonicalized-after-observation ordering, and no universal freshness label. The controlled disruptive restart then restarted only canonical-state-service and proved all five domains reconcile from durable observations without revision rollback. The plan/ledger workflow correctly removed satisfied tests and left no outstanding current-plan tests.



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
