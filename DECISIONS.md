# Decisions

This file records durable architectural decisions. Revisit a locked decision only for a concrete technical reason and record the change rather than silently rewriting history.

## D-001 — Centralized control plane
**Status:** Locked

Use centralized state, resource/authority/budget management, scheduling, and execution instead of independent scripts competing for resources.

## D-002 — Thin supervisor
**Status:** Locked

The main daemon/supervisor manages service lifecycle and health. Domain strategy lives in independent modules/services.

## D-003 — Single canonical state
**Status:** Locked

Shared player/game/resource state has one canonical owner. Modules consume it through interfaces and may not create competing sources of truth.

## D-004 — Shared authority and budget model
**Status:** Locked

RAM, money, stock symbols, targets, player work, sleeves, and other contested resources/domains use the common Resource, Authority & Budget Manager rather than bespoke ownership systems.

## D-005 — Separate decision from execution
**Status:** Locked

Controllers own intent/strategy; designated executors perform side effects. Example: stock manipulation may own symbol authority while the trader remains the sole trade executor.

## D-006 — React dashboards are first-class
**Status:** Locked

Maintain a Production Dashboard for operations and a Validation Dashboard for correctness/health. Validation UI evolves alongside core systems and is part of completion criteria.

## D-007 — Updater is bootstrap infrastructure
**Status:** Locked

Git sync/update tooling remains recoverable and partly independent of the control plane so it can update or recover the control plane itself.

## D-008 — Manifest controls persistent runtime updates
**Status:** Locked

Persistence is declared at runtime-unit level. Persistent units are restarted only after explicit manifest change/retirement plus successful staged validation.

## D-009 — Repository is project memory
**Status:** Locked

Code, current state, decisions, fixes, rules, references, and handoff context live in GitHub. Chat should remain compact and should not carry source-code dumps by default.
