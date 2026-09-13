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
