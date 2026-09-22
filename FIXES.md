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

---

### FIX-006 — Raw discovery lag and mutable branch sources could mix releases
**Date:** 2026-09-15  
**Status:** Resolved  
**Subsystem:** M1 Reliable Deployment / release discovery and content integrity  
**Affected files:**
- `src/bootstrap/update-watcher.js`
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `src/ui/update-dashboard.jsx`
- `deployment/version.json`
- release manifests under `deployment/releases/`

#### Symptoms
New revisions repeatedly remained invisible to the 30-second watcher for multiple polls. r11 took roughly 4–5 minutes to appear even though GitHub `main` already contained the new descriptor. Separately, a stale release descriptor could stage changed files because its revision-specific manifest still referenced source paths fetched from mutable `main`.

#### Root cause
Cache-busting did not make the GitHub Raw branch view immediately consistent, so repeated Raw checks could observe the same stale branch state. Revision-specific manifest filenames fixed metadata mixing but did not make file content immutable because manifest `source` paths were still downloaded from mutable `main`. The helper also refreshed `git-pull.js` from mutable `main` after the puller exited.

#### Fix
Release discovery now combines cache-busted Raw checks with a lower-frequency public GitHub Contents API check and selects the highest valid revision. Approval forces another API verification, while the puller independently performs both discovery checks.

Production descriptors carry immutable Git commit SHA `releaseRef`. The puller fetches the manifest and all managed sources from that exact commit, and the helper refreshes `git-pull.js` from the same pinned release content before committing deployment state. r12 was the one-time compatibility bridge for the old r11 puller.

#### Verification
The r12 transition installed successfully and its new puller returned `CLEAN | v0.4.0-r12 | unchanged 3 | refreshed 1 | updated 0 | added 0` on a same-revision dry run. Controlled r13 was detected within one normal watcher interval instead of the earlier 4–5 minute lag. r14 then installed successfully using normal canonical manifest source paths resolved through its immutable `releaseRef`, proving the normal post-transition pinned-content path.

#### Prevention / notes
A mutable discovery pointer may be eventually consistent; it must never also define immutable release bytes. Discovery and content identity remain separate concerns. Highest-valid-revision source selection is allowed for discovery, but all manifest and source downloads after selection must use the selected descriptor's immutable release ref. Unpinned post-transition self-refresh fails closed.

#### Related
- D-010 — Deployment identity uses version plus revision.
- D-014 — Release manifests use immutable revision-specific paths.
- D-017 — Release discovery is redundant; release content is commit-pinned.


---

### FIX-007 — Removed purchased-server API degraded infrastructure collector
**Date:** 2026-09-21  
**Status:** Resolved  
**Subsystem:** M2 observation collectors / infrastructure  
**Affected files:**
- `src/collectors/infrastructure-collector.js`

#### Symptoms
After r32 installed on Bitburner v3.0.1, only `infrastructure-collector` degraded with `getPurchasedServers: Function removed in 3.0.0. Please use ns.cloud.getServerNames() instead.` The other reporting services remained healthy.

#### Root cause
The r32 collector used the pre-v3 `ns.getPurchasedServers()` API. Bitburner v3 moved purchased-server management to the Cloud API and removed that function.

#### Fix
Infrastructure observation now enumerates owned cloud servers with `ns.cloud.getServerNames()` and continues to read each server through `ns.getServer()`.

#### Verification
The v3.0.1 official generated API documentation confirms `Cloud.getServerNames()` is the supported server-enumeration API and no generated `NS.getPurchasedServers()` method exists. Runtime recovery is pending r33 installation.

#### Prevention / notes
For Bitburner v3 work, verify the exact current namespace as well as the method name. A familiar v2 Netscript method must not be assumed to survive a major-version namespace migration. Collector failures remain isolated by D-025.

#### Related
- D-025 — M2 game observations use isolated domain collectors.


---

### FIX-008 — Persistent runtime replacement left Validation Dashboard tail open
**Date:** 2026-09-21  
**Status:** Resolved and runtime validated in r47  
**Subsystem:** M1 deployment runtime reconciliation / M2 Validation Dashboard  
**Affected files:**
- `src/bootstrap/git-pull-self-update.js`

#### Symptoms
Deployments that changed the persistent Validation Dashboard restarted its process successfully, but the previous Validation Dashboard native tail window remained open. Repeated updates could therefore leave stale dashboard windows behind.

#### Root cause
The generic persistent-unit reconciliation path stopped changed processes with `ns.kill(pid)` but did not close their native tail first. The older special-case dashboard refresh path already followed the required order from FIX-005: `ns.ui.closeTail(pid)` before process termination.

#### Fix
Generic persistent process replacement now closes the process tail before issuing the kill request. This applies the existing managed-UI lifecycle invariant to persistent runtime units, including the Validation Dashboard, instead of adding another dashboard-specific exception.

#### Verification
Repository inspection confirms changed/retired persistent units use close-tail-before-kill. Runtime r47 installation through the integrated Updater closed the previous Validation Dashboard tail and restarted exactly one fresh Validation Dashboard window.

#### Prevention / notes
Process termination and tail-window cleanup are separate Bitburner lifecycle actions. Any deployment path that intentionally replaces a managed process must close its tail before killing it; this is harmless for managed processes without an open tail.

#### Related
- FIX-005 — Replaced dashboard process left its old tail window open.
- D-015 — Post-update helper reconciles persistent runtime units.


---

### FIX-009 — New manifest retirement field was invisible to the pre-feature puller
**Date:** 2026-09-21  
**Status:** Resolved and runtime validated in r51  
**Subsystem:** M1 deployment / managed-file retirement transition  
**Affected files:**
- `src/bootstrap/git-pull.js`
- `src/bootstrap/git-pull-self-update.js`
- `deployment/releases/r50-manifest.json`
- `deployment/releases/r51-manifest.json`

#### Symptoms
r50 installed successfully and the new backend owners stopped relaunching the standalone Health and Update Watcher dashboards, but deployment printed `retired 0` and both already-running legacy dashboard windows remained.

#### Root cause
The r50 deployment transaction itself was executed by the installed r49 `git-pull.js`. r50 contained the new retirement-aware puller and helper, but the puller self-refresh is intentionally deferred until after staging. The r49 puller did not parse or serialize the newly introduced `retireFiles` manifest field into `data/deployment-pending.txt`. The newly staged r50 helper therefore received no retirement plan and correctly performed zero retirements.

#### Fix
Use r50 as the bootstrap transition that installs the retirement-aware puller, then repeat the explicit retirement declarations in r51. The locally installed r50 puller can serialize the r51 retirement plan, allowing the r50/r51 helper path to execute stop → verify stopped → delete → verify absent.

#### Verification
r50 runtime observation confirmed the compatibility gap. r51 runtime output printed STOPPED, VERIFIED STOPPED, DELETED, and VERIFIED ABSENT for both legacy dashboard scripts, with `requested 2 | deleted 2 | already absent 0 | failed 0` and final `retired 2`. Both legacy tails disappeared while the backend updater remained ONLINE / Install clean.

#### Prevention / notes
Any release that introduces a new manifest field whose semantics must be acted on by the currently running puller requires a compatibility transition. New helper behavior alone is insufficient when the old puller is responsible for constructing pending state. Design future deployment-schema changes against the N-1 puller or use a deliberate two-release transition.

#### Related
- D-012 — Puller self-update uses post-exit helper.
- D-031 — Managed file retirement requires explicit stop-verify-delete authorization.


---

### FIX-010 — Live canonical validation used race-prone snapshot equality
**Date:** 2026-09-22  
**Status:** Corrected; runtime validation pending  
**Subsystem:** M3 canonical state / validation  
**Affected files:**
- `src/core/canonical-state-service.js`
- `src/validation/tests/canonical-state-test.js`
- `src/validation/tests/canonical-restart-test.js`

#### Symptoms
The first r54 SAFE canonical-state validation passed player, network, and market checks but failed `timestamp-infrastructure`. Operator inspection later showed different observation/state timestamps, but those files were read at different wall-clock times while the 5-second infrastructure collector continued producing observations.

#### Root cause
The validation test compared two independently read live files for exact equality once. A collector/canonical update between those reads can produce a false failure even when the canonical path preserves the producer timestamp correctly. Separately, canonical durable-snapshot reconciliation ran only when a loop accepted zero port observations, so unrelated ingress could postpone reconciliation.

#### Fix
Canonical state now reconciles durable snapshots every service loop after draining transient ingress. SAFE and restart validation use bounded convergence sampling: they allow the live producer/canonical pair up to three seconds to expose a matching observation timestamp rather than treating one cross-file read as an atomic snapshot. The strict requirement remains that canonical `observedAt` must equal a producer observation; the fix does not replace equality with an age tolerance.

#### Verification
Repository inspection confirms `writeObservation()` writes the durable observation before publishing that same envelope to its port. Official Bitburner v3.0.1-generated API documentation defines `ns.write()` as synchronous/void. Runtime re-validation is pending the corrective release.

#### Prevention / notes
Validation over independently changing runtime files must not assume a multi-file atomic read. When exact identity is the invariant, use bounded convergence or an explicit correlation identifier rather than weakening identity into an arbitrary timestamp tolerance.

#### Related
- D-032 — M3 canonical state separates factual time from consumer freshness.


---

### FIX-011 — Watcher poll cadence overstated redundant discovery freshness
**Date:** 2026-09-22  
**Status:** Resolved and runtime validated in r56/r57  
**Subsystem:** M1 Reliable Deployment / release discovery  
**Affected files:**
- `src/bootstrap/update-watcher.js`
- `ARCHITECTURE.md`
- `DECISIONS.md`

#### Symptoms
Recent releases sometimes required 2–3 operator-visible 30-second watcher cycles before appearing even though Raw requests already carried a changing cache-busting query parameter.

#### Root cause
The displayed 30-second poll was not actually a complete redundant discovery cycle. Raw was sampled every 30 seconds, but the GitHub Contents API fallback was sampled only every 75 seconds. Raw branch views can retain propagation/cache latency even with unique query strings, so the first reliably fresh API observation could naturally arrive after 2–3 displayed cycles.

#### Fix
A normal watcher discovery cycle is now 65 seconds and samples both Raw and Contents API together. The unique Raw cache-buster remains, but is no longer treated as a freshness guarantee. The 65-second cadence keeps normal unauthenticated Contents API traffic below GitHub's 60 requests/hour public ceiling with small headroom. Approval still forces a fresh complete check.

#### Verification
Repository inspection confirms every normal `checkRemote` invocation now fetches both sources and the published `pollIntervalMs` matches that complete-cycle cadence. After r56 installed cleanly, harmless r57 was published specifically as a discovery probe. The installed r56 watcher presented r57 on its first normal 65-second complete discovery cycle, validating the corrected cadence and redundant discovery behavior.

#### Prevention / notes
Operator-visible polling cadence must describe the cadence of the reliability guarantee, not merely the fastest partial source. If redundant sources intentionally run at different frequencies, UI/telemetry must expose those as separate cadences rather than calling the faster partial check the update poll.

#### Related
- FIX-006 — Raw discovery lag and mutable branch sources could mix releases.
- D-017 — Release discovery is redundant; release content is commit-pinned.
- D-034 — Operator-visible update poll is one complete redundant discovery cycle.


## FIX-012 — Generated source patch preserved a literal escape sequence
**Status:** Corrected in source; runtime validated through r66

**Symptom:** r64 and r65 both committed deployment files but persistent runtime reconciliation degraded because `canonical-state-service.js` could not launch. Health retained the previous canonical-state instance as stale.

**Cause:** The repository source contained the two literal characters backslash+n between JavaScript declarations (`;\\nconst`). The first attempted r65 repair used an incorrectly escaped replacement pattern, so it changed adjacent integration logic but did not remove those literal characters. Review of the immutable r65 releaseRef confirmed the malformed source was still pinned into that release.

**Fix / prevention:** Match generated escape sequences explicitly when repairing programmatically generated source and verify the exact immutable releaseRef contents before publishing the corrective release. For syntax-sensitive generated edits, inspect the exact changed source rather than relying on the mutation call succeeding.


## FIX-013 — Validation fixture teardown was misclassified as a stale service
**Status:** Corrected and runtime validated through v0.6.0-r69

**Symptom:** r68 diagnostics failure-correlation passed its 8 recovery assertions, then the Validation Dashboard returned to Attention because the validation-only fixture was killed after its final healthy heartbeat. Health retained the last instance and later marked it stale, which Diagnostics correctly reported as a new incident.

**Cause:** Health had instance replacement/recovery semantics but no explicit intentional-retirement event. Killing an ephemeral producer was observationally indistinguishable from a crashed producer.

**Fix:** Add versioned service-retirement telemetry. Health removes only the exact matching active instance and records informational SERVICE_RETIRED evidence. The fixture requests retirement and exits itself; the validation now proves the service remains absent and its prior diagnostic remains resolved after the stale window.

**Prevention:** Any future ephemeral service that publishes health must explicitly retire its registered instance before normal exit. Do not suppress stale detection or special-case service names.


### FIX-013 — Validation child executor inherited dashboard host and could not read home-owned control state
**Status:** Corrected and runtime validated through r77

**Symptom:** r74 `m3.authority.real-weaken` passed target selection, authority grant, Work Order activation, executor launch, terminal closure, and cleanup, but the temporary executor denied DELEGATED authorization and therefore did not call `ns.weaken()`.

**Cause:** The validation test used `ns.run()`, which launches on the caller's current host. The Validation Dashboard may be placed on a purchased server. Authority and Work Order durable state are home-owned. The executor checked `fileExists(path, "home")` but then used `ns.read(path)`, which reads its current host, so a remotely launched fixture observed null control state and correctly failed closed.

**Fix:** The fixture controller now uses `ns.exec(..., "home", ...)` for this home-state integration proof. The executor also explicitly fails closed when not running on home. Failed authorization assertions now preserve the actual denial reason instead of using success-only evidence wording.

**Prevention:** Validation fixtures that depend on home-owned durable control state must either execute on home or use an explicit supported transport/state-access mechanism. Never combine a remote `fileExists(..., "home")` check with an implicit local `ns.read()` and assume the bytes came from home.


### FIX-014 — Real delegated executor reconstructed an invalid authority claim shape
**Status:** Corrected and runtime validated through r77

**Symptom:** r75 `m3.authority.real-weaken` reached a home-hosted executor but `delegatedAuthorization()` denied with `invalid-delegation-state`.

**Cause:** The validation executor manually built `{kind,id,capability}`. The Authority contract requires `{resource:{kind,id},capability}`. The controller and Work Order used the correct shared `authorityClaim()` helper, but the executor duplicated the schema incorrectly.

**Fix:** The executor now imports and uses `authorityClaim()`. Delegated authorization precondition failures are also reported separately as `invalid-authority-state`, `invalid-work-order-state`, `invalid-claim`, or `invalid-time`.

**Prevention:** Consumers must use shared contract constructors/helpers for authority claims instead of reconstructing contract objects manually. Validation/diagnostic APIs should not collapse unrelated contract failures into one reason when the distinction can be reported safely.


### FIX-015 — Real weaken validation used fixed lifetimes shorter than the game action
**Status:** Corrected and runtime validated in r77

**Symptom:** r76 `m3.authority.real-weaken` ran for about 91.8 seconds, then reported no executor result and a still-live executor.

**Cause:** The fixture capped result waiting and its Work Order at roughly 90 seconds without considering `ns.getWeakenTime(target)`. A legitimate weaken can exceed that duration. The cleanup assertion also ran before the finally block's process kill.

**Fix:** Eligible targets must have a measured weaken duration that fits within the existing bounded Authority/Work Order maximum. Lease, Work Order, and controller wait durations are derived from that measured action time with margins. Cleanup now terminates/waits for any surviving fixture process before asserting no live executor.

**Prevention:** Real-action validation must derive bounded lifetimes from the operation's measured duration rather than arbitrary short fixture constants. Cleanup assertions must observe post-cleanup state, not pre-finally state.
