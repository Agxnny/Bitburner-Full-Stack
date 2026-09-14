# Project Rules

## Repository and chat

1. The repository is the permanent source of truth. Chat is for reasoning, decisions, reviews, test results, and concise summaries.
2. Do not paste implementation code into chat unless explicitly requested. Full source files belong in GitHub.
3. When modifying code, prefer full-file edits from the current repository version. Keep files small enough for safe full-file replacement; target roughly 150–300 lines, with ~400 as a soft ceiling unless there is a strong reason not to split.
4. Use one clear responsibility per file/module.
5. Before changing code in a future chat, read `PROJECT_RULES.md`, `CHANGES.md`, `CURRENT_STATE.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries.

## Workflow discipline

6. Features follow: Idea → Backlog → Design → Approved → Implementation → Validation → Documentation → Complete.
7. Only one implementation feature should be active at a time. New ideas are captured in the roadmap/backlog unless they block the active feature.
8. Do not opportunistically redesign unrelated systems while implementing another feature.
9. A milestone is not complete until its behavior is validated and its documentation/current state is updated.
10. Architectural decisions are recorded in `DECISIONS.md`. Locked decisions are revisited only for a concrete technical reason.
11. Reusable bug fixes and incident learnings are recorded in `FIXES.md`; search that file before attempting a new fix.
12. Code and documentation that describe the changed interface/behavior should be updated together.

## Architecture

13. Shared game state has one canonical owner. Other modules may cache but may not establish competing truth.
14. Controllers decide desired behavior; execution paths perform side effects. Execution capability does not imply decision authority.
15. No subsystem may act on a contested resource/domain without current authority from the shared authority system.
16. Divisible shared resources such as RAM and money require budgets/leases. Visibility of total game resources never implies spending authority.
17. No subsystem may create a duplicate global allocator, ownership ledger, budget system, scheduler, or executor when an existing core abstraction applies.
18. New mechanics must integrate through existing state, authority, budget, scheduler, executor, messaging, and telemetry abstractions before introducing a new core abstraction.
19. Authority loss or stale/invalid authority data fails closed: stop acting rather than assume permission.
20. Explicit authority transfer is distinct from ordinary priority. Priority alone must not silently steal ownership.
21. Temporary leases must expire or have an explicit lifecycle. Orphaned leases/reservations must be reconciled and released.
22. Budget/accounting state must reconcile periodically with actual game state, including manual player actions.
23. Every managed action/job should be attributable to an owner and correlation identifier.
24. Prefer idempotent commands and actions so retries/restarts do not duplicate side effects.
25. Commands mean “do this”; events mean “this happened.” Keep them distinct.
26. Avoid circular module dependencies and hidden cross-module coordination.
27. Persistent services expose health/heartbeat state and support graceful degradation where safe.
28. Maintain an explicit startup/shutdown dependency order.
29. Use bounded queues and backpressure; do not allow uncontrolled work accumulation.
30. Core schemas/interfaces are validated and versioned when compatibility matters.
31. Use consistent timestamps, identifiers, lifecycle states, and naming conventions.
32. No shared mutable globals as a substitute for the canonical state/authority systems.
33. Optimize only when a measured constraint justifies added complexity, especially for Netscript RAM cost.

## Safety and operator control

34. Provide a manual override path for pausing modules, revoking authority, freezing spending, and entering safe mode.
35. Safe mode observes and reports but prevents nonessential side effects.
36. Automatic fallback/recovery that changes behavior must be visible in telemetry/logs.

## Updates and persistent processes

37. Runtime data and user overrides are protected from deployment unless explicitly classified as deployable.
38. A persistent process must not be stopped merely because an update exists.
39. A persistent runtime unit may be restarted only when a valid newer manifest explicitly marks its runtime unit changed or retired, replacement files have been successfully staged/validated, and controlled restart has begun.
40. A failed or partial update must leave currently running persistent processes untouched.
41. Disappearance of a persistent unit from a manifest is not authorization to terminate it; retirement must be explicit.
42. The update orchestrator itself is restarted last.

## Dashboards and validation

43. React dashboards are first-class system consumers of structured telemetry, not sources of truth.
44. Dashboard actions must use the same command/authority interfaces as other clients; no UI-only administrative bypass.
45. Maintain a Production Dashboard (“what is the system doing?”) and a Validation Dashboard (“is the system correct, and why?”).
46. Every major subsystem must expose operational and validation telemetry.
47. A core subsystem is not complete until its health/invariants are observable through the Validation Dashboard or its established validation interface.

## Change continuity and feature documentation

48. `CHANGES.md` is the required lightweight working record for the currently active repository change. Before the first repository mutation for a new feature, fix, or meaningful change, create or refresh its active-change entry.
49. Update the active `CHANGES.md` entry after meaningful implementation steps, before switching tasks, before ending a development session, and before handing runtime validation to the operator. At minimum preserve goal, current status, important files/areas touched, relevant decisions/constraints, validation state, exact next step, and blockers/risks when applicable.
50. `CHANGES.md` is not a second lifecycle or permanent architecture log. Completed work is summarized briefly there; durable milestone state belongs in `CURRENT_STATE.md`, architectural decisions in `DECISIONS.md`, reusable incidents in `FIXES.md`, and subsystem behavior in its feature documentation.
51. Every feature or subsystem must have an identifiable documentation owner, normally the nearest feature/module `README.md` or an explicitly named feature document. When feature behavior, interfaces, commands, configuration, lifecycle, telemetry, validation procedure, or operator workflow changes, update that feature documentation in the same work item.
52. A feature change is not complete if its feature documentation is stale. If no appropriate feature document exists yet, create one before marking the change complete.
