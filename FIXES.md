# Fixes

Search this file before attempting a new fix for an error or incorrect behavior. Add entries for reusable incidents/fixes rather than transient typos.

## Entry template

### FIX-XXX — Short title
**Date:** YYYY-MM-DD  
**Status:** Resolved | Superseded | Investigating  
**Subsystem:**  
**Affected files:**

#### Symptoms
Record the observable behavior and concise relevant error text.

#### Root cause
Record why it happened.

#### Fix
Record what changed and why the change works.

#### Verification
Record how the fix was proven.

#### Prevention / notes
Record invariant, rule, API caveat, or regression risk worth remembering.

#### Related
Reference decisions, issues, or later fixes.

---

### FIX-001 — Shell alias pointed to obsolete bootstrap copy
**Date:** 2026-09-14  
**Status:** Resolved  
**Subsystem:** M1 Reliable Deployment / bootstrap entrypoint  
**Affected files:**
- Runtime shell alias `gp`
- `src/bootstrap/git-pull.js`

#### Symptoms
Running `gp` produced legacy output such as `git-pull: checking remote deployment state...` and `Refusing downgrade r4 -> r3`, while running `src/bootstrap/git-pull.js` directly produced the current compact deployment summary.

#### Root cause
The shell alias was still `gp=git-pull.js`, pointing at the original manually bootstrapped root-level copy. The canonical self-updating puller lives at `src/bootstrap/git-pull.js`, so successful updates did not replace the obsolete root copy that the alias continued to launch.

#### Fix
Replace the alias with `gp=src/bootstrap/git-pull.js` so the operator entrypoint always invokes the canonical deployed puller.

#### Verification
After updating the alias, `gp` returned `CLEAN | v0.1.0-r3 | unchanged 2 | refreshed 0 | updated 0 | added 0`. A stale-revision simulation with local revision temporarily set to r4 then returned `ALARM | STALE REVISION | local v0.1.0-r4 | remote v0.1.0-r3 | pull blocked`, and normal behavior returned after restoring r3.

#### Prevention / notes
User-facing aliases and launch commands must point at canonical managed paths. Never rely on an unmanaged bootstrap copy after the managed deployment path exists.

#### Related
- D-012 — Puller self-update uses post-exit helper.

---

### FIX-002 — React callback made concurrent Netscript calls
**Date:** 2026-09-14  
**Status:** Resolved  
**Subsystem:** M1 Reliable Deployment / update dashboard  
**Affected files:**
- `src/ui/update-dashboard.jsx`

#### Symptoms
Launching the dashboard terminated `main()` with `fileExists: Failed to run due to failed concurrency check` and `Concurrent calls to Netscript functions are not allowed`, while `sleep` was the currently running Netscript call.

#### Root cause
React effects and button callbacks invoked Netscript APIs (`fileExists`, `read`, and `write`) while the script's main async loop was sleeping. Bitburner permits only one active Netscript call for a script at a time, so UI callbacks raced the main loop.

#### Fix
React now performs only ordinary JavaScript state work. `main()` is the sole owner of Netscript access: it reads telemetry snapshots and serially writes queued UI intents. A local in-memory bridge carries snapshots and button intents between the React tree and the main loop without calling Netscript from React callbacks.

#### Verification
The fix was delivered through recovery release `v0.2.0-r8`. The dashboard rendered continuously, watcher telemetry updated, and a decline command was accepted without the prior concurrency termination.

#### Prevention / notes
React components, timers, effects, and event callbacks must not call Netscript APIs while an async Netscript call may be active. Route UI actions to the script main loop (or another serialized Netscript owner) through ordinary JavaScript state/queues.

#### Related
- D-013 — Update watcher owns detection and approval-command handling.

---

### FIX-003 — Mutable manifest path allowed cross-release metadata mixing
**Date:** 2026-09-14  
**Status:** Resolved  
**Subsystem:** M1 Reliable Deployment / release publication
**Affected files:**
- `deployment/version.json`
- `deployment/manifest.json`
- `deployment/releases/r8-manifest.json`

#### Symptoms
Running `gp` twice from local r5 failed safely with `FAIL | v0.2.0-r6 | Version descriptor and manifest disagree.`

#### Root cause
The puller cache-busted both requests, but r6 and r7 descriptors both referenced the same mutable `deployment/manifest.json`. GitHub Raw propagation exposed an older r6 descriptor during one request and the newer r7 contents of the shared manifest during the following request. Cache busting prevents cached URL reuse; it does not provide atomic multi-file publication.

#### Fix
Starting with r8, release descriptors point to immutable revision-specific manifest paths under `deployment/releases/`, beginning with `deployment/releases/r8-manifest.json`. The descriptor is published only after its immutable manifest exists. The puller's existing descriptor/manifest identity check remains the fail-closed guard.

#### Verification
Runtime `gp --dry-run` validated `v0.2.0-r8` and its immutable manifest cleanly, and a normal `gp` reconciled the local committed state to r8.

#### Prevention / notes
Never publish a new release descriptor that points to a mutable shared manifest pathname. New releases create their immutable manifest first, then update `deployment/version.json` last. Cache busting and immutable release metadata solve different problems and both remain required.

#### Related
- D-010 — Deployment identity uses version plus revision.
- D-014 — Release manifests use immutable revision-specific paths.

---

### FIX-004 — Managed files were newer than committed deployment ledger
**Date:** 2026-09-14  
**Status:** Investigating  
**Subsystem:** M1 Reliable Deployment / deployment state reconciliation  
**Affected files:**
- `data/deployment-state.txt`
- `data/git-pull-report.json`
- managed r8 bootstrap/UI files

#### Symptoms
The update dashboard and watcher were visibly running newer r8-era code while `data/deployment-state.txt` and `data/git-pull-report.json` still described the last committed r3 transition. No `data/deployment-pending.txt` file remained.

#### Root cause
The exact historical path that produced the drift is not proven. The evidence rules out a currently pending helper transaction. Do not infer a root cause without additional runtime evidence.

#### Fix
No manual ledger edit was used. `gp --dry-run` first proved that all four managed files already matched r8. A normal `gp` then executed the canonical transaction and advanced the durable deployment ledger to r8.

#### Verification
After the normal pull, `data/deployment-state.txt` reported revision 8.

#### Prevention / notes
When managed files and the deployment ledger disagree, validate the canonical puller and current immutable manifest first. Prefer a normal deployment transaction to manual state edits. The r9 runtime-unit work adds clearer helper/runtime phases but does not claim to retroactively explain this incident.

#### Related
- D-012 — Puller self-update uses post-exit helper.
- D-015 — Post-update helper reconciles persistent runtime units.

---

### FIX-005 — Replaced dashboard process left its old tail window open
**Date:** 2026-09-15  
**Status:** Resolved  
**Subsystem:** M1 Reliable Deployment / watcher-owned update dashboard  
**Affected files:**
- `src/bootstrap/update-watcher.js`

#### Symptoms
The r10 changed-persistent-unit test correctly restarted the update watcher and opened a new update dashboard, but the old dashboard tail window remained visible after its process was replaced.

#### Root cause
Watcher ownership takeover killed the old dashboard process before launching the replacement, but did not explicitly close the old process's tail window. Process termination and UI tail cleanup are separate lifecycle actions.

#### Fix
Before killing each watcher-owned dashboard process, the watcher now calls `ns.ui.closeTail(process.pid)`, then kills that process, then launches exactly one replacement dashboard.

#### Verification
Runtime deployment of `v0.3.0-r11` confirmed the old dashboard tail closed and exactly one fresh dashboard opened under the replacement watcher.

#### Prevention / notes
When a managed UI process is intentionally replaced, its owned UI surface must be explicitly closed before process termination. Bitburner v3.0.1 exposes `ns.ui.closeTail(pid)` for this purpose.

#### Related
- D-016 — Update watcher owns update dashboard lifecycle.
