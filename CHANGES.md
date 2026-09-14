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

### Documentation durability and feature-doc synchronization
**Status:** Documentation / finalization

**Goal:** Add a repository rule that preserves in-progress changes and requires feature documentation to stay synchronized with feature behavior.

**Files / areas touched:**
- `CHANGES.md`
- `PROJECT_RULES.md`
- `README.md`
- `CURRENT_STATE.md`
- `src/ui/README.md`
- relevant future feature documentation

**Decisions / constraints:**
- `CHANGES.md` is a lightweight working scratchpad, not another full lifecycle system.
- The active entry must be updated before context switches or handoffs.
- Any feature behavior/interface change must update that feature's documentation in the same work item.
- If a feature has no documentation yet, create a suitable README or feature document before considering the change complete.

**Validation:** `PROJECT_RULES.md` now requires `CHANGES.md` continuity and same-work-item feature documentation updates. The repository startup flow now includes `CHANGES.md`, and the UI feature documentation has been synchronized with the runtime-validated r15 window-memory behavior.

**Next step:** Update `CURRENT_STATE.md` with the new documentation workflow and r15 validation, then mark this working change complete.

## Recently completed

### r15 dashboard window geometry memory
**Status:** Runtime validated

The update dashboard now persists its tail position and size and restores them after watcher-driven relaunch. The behavior was confirmed in runtime after `v0.4.0-r15` deployment. The shared behavior is intended for all future dashboards.
