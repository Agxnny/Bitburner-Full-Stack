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

## D-010 — Deployment identity uses version plus revision
**Status:** Locked

Deployments expose a semantic version in `vX.Y.Z` form and a monotonically increasing integer revision. Semantic version communicates release meaning; revision is the freshness/update sequence. A revision is immutable once released and may not be reused for different deployable content.

## D-011 — Update approval is always human initiated
**Status:** Locked

The update watcher may detect and present a newer revision but must never automatically pull it. The player explicitly approves or declines the specific revision presented. Approval for one revision does not authorize a newer revision that appears before deployment starts.

## D-012 — Puller self-update uses a post-exit helper
**Status:** Locked

`git-pull.js` never replaces its own running file as part of normal activation. A minimal helper is updated first, launched by the puller, waits for the puller's PID to exit, then cache-busts and downloads the current `git-pull.js` before committing local deployment state. The helper invocation contract remains compatible for manifest schema version 1.

## D-013 — Update watcher owns detection and approval command handling
**Status:** Locked

`src/bootstrap/update-watcher.js` is the persistent owner of remote release detection and update approval command handling. It polls the cache-busted deployment descriptor, publishes structured status under protected runtime data, and never installs automatically.

Dashboard actions write a bounded single-slot update command through the standard command path. On approval, the watcher re-verifies the remote descriptor and only then launches `git-pull.js --expect-revision N`. The puller remains the deployment executor and independently enforces the exact approved revision. Dashboard code may not invoke the puller directly.

## D-014 — Release manifests use immutable revision-specific paths
**Status:** Locked

Every published deployment descriptor must point to a manifest path unique to that immutable revision, for example `deployment/releases/r8-manifest.json`. A mutable shared manifest path must not be used by new release descriptors.

Cache busting prevents reuse of a cached URL response but does not make multiple GitHub Raw files publish atomically. Revision-specific manifest paths ensure that a descriptor observed from one repository propagation state cannot accidentally pair with a manifest from a later release. The puller's descriptor/manifest identity validation remains mandatory and must fail closed on any mismatch.
