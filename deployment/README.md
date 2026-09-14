# Deployment

Deployment metadata and bootstrap update behavior live here. Runtime deployment state is protected under `data/` and is never sourced from the repository.

## Release identity

Each deployable release has:
- semantic version: `vX.Y.Z`
- monotonically increasing revision
- immutable revision-specific manifest
- immutable Git commit SHA `releaseRef` for production release content

A revision is immutable once published and must never be reused for different deployable content.

`deployment/version.json` is the mutable discovery pointer. It names the current version/revision, revision-specific manifest path, and the immutable `releaseRef` containing that manifest and all release sources.

Starting with r8, every descriptor points to a manifest unique to its revision, for example `deployment/releases/r8-manifest.json`. Starting with r12, production descriptors also carry a 40-character Git commit SHA in `releaseRef`.

Normal release publication order is:
1. publish source changes
2. create the immutable revision manifest
3. verify manifest version/revision identity
4. record the commit SHA that contains the finished source + manifest as `releaseRef`
5. update `deployment/version.json` last

Do not use `deployment/manifest.json` for new releases. It is legacy metadata only.

## r12 transition release

r12 is the one-time bridge from the old mutable-branch source model to commit-pinned releases. The r11 puller does not understand `releaseRef`, so `deployment/releases/r12-manifest.json` points to revision-unique source snapshots under `deployment/releases/r12-src/`.

The old puller can safely stage those immutable-by-path transition files. The new r12 helper permits the same snapshot path only when completing revision 12. Later production releases must supply `releaseRef`; unpinned puller self-refresh fails closed.

From r13 onward, manifests may point to normal canonical repository source paths because the puller resolves every path against the descriptor's immutable `releaseRef`, not mutable `main`.

## Release discovery

Raw branch propagation proved too slow to be the only freshness signal: observed revisions remained stale across multiple 30-second polls for several minutes.

The watcher therefore uses redundant discovery:
- cache-busted GitHub Raw `deployment/version.json` every 30 seconds
- public GitHub Contents API every 75 seconds
- an API check is forced again when the player approves a revision
- the highest valid revision wins
- equal revisions must agree on version, manifest, and `releaseRef` or discovery fails closed

The 75-second API cadence intentionally stays below GitHub's unauthenticated public REST rate limit while leaving headroom for approval/deployment checks. If one source fails, the other valid source may continue to provide discovery. Status telemetry records each source's last attempt, last success, revision, error, and the selected source.

`git-pull.js` independently checks both discovery sources for every normal deployment before enforcing `--expect-revision`. This prevents the watcher from presenting a revision that the puller cannot independently verify because Raw is still stale.

## Immutable release content

After discovery, release identity and release bytes are separate concerns. The mutable pointer selects a release; it does not define the bytes installed for that release.

For pinned releases the puller fetches:
- the manifest from `raw.githubusercontent.com/<repo>/<releaseRef>/<manifest>`
- every manifest `source` from that same `releaseRef`
- never from mutable `main`

`git-pull-self-update.js` also refreshes `git-pull.js` from the same pinned release before committing deployment state. This prevents an older descriptor/manifest identity from being combined with newer branch content.

## Runtime-unit contract

Manifest schema version 1 may include `runtimeUnits`. M1 supports persistent units on `home` with:
- `id`
- `lifecycle` = `persistent`
- `script`
- `host` = `home`
- `threads` and `args`
- `files` defining restart eligibility
- `restartOrder`

`git-pull.js` derives whether each unit changed from staged file actions. `updated` and `added` defining files make a unit changed; an identical forced refresh does not.

After puller self-refresh, `git-pull-self-update.js` reconciles persistent units:
- unchanged + running → preserve
- unchanged + missing → relaunch
- changed + running → stop and restart
- changed + missing → launch

Updater/watch infrastructure uses the final restart order. A runtime launch failure leaves the file deployment committed and reports `committed-runtime-degraded`.

## Pull reporting

`src/bootstrap/git-pull.js` writes `data/git-pull-report.json` with local/remote release identity, discovery source telemetry, pull options, per-file actions, aggregate counts, runtime reconciliation state, timestamps, success state, errors, and alarms.

File actions are:
- `unchanged`
- `refreshed`
- `updated`
- `added`

Normal terminal output remains concise.

## Update watcher and approval flow

`src/bootstrap/update-watcher.js` is the persistent detector and update-command owner. It:
- runs as a singleton on `home`
- performs redundant release discovery
- publishes `data/update-status.json`
- owns exactly one managed `src/ui/update-dashboard.jsx` child
- consumes the bounded command slot `data/update-command.json`
- never installs automatically
- re-verifies the exact approved revision
- delegates installation to `git-pull.js --expect-revision N`
- rejects approval while puller/helper infrastructure is already active

The dashboard reads watcher/deployment telemetry and writes commands. It never launches the puller and never calls Netscript from React callbacks.

### Exact-revision approval validation

The controlled stale-approval test uses two no-op releases so production behavior is exercised without changing runtime source bytes:
1. publish revision N and wait until the dashboard presents it
2. do not approve N
3. publish revision N+1 and wait until the watcher can verify N+1
4. submit an approval command explicitly bound to revision N
5. expect the watcher to force fresh verification, reject the command because N is no longer the current newer revision, and launch no deployment
6. confirm N+1 was not implicitly authorized; it must still require its own explicit approval

M1 runtime validation used r16 as N and r17 as N+1 while the local runtime remained on r15. After r17 was presented, a deliberately stale r16 approval was submitted through `data/update-command.json`. The watcher rejected it with `Approved revision is no longer the current newer release.` The dashboard continued presenting r17, so r16 was not installed and r17 was not implicitly authorized. Exact-revision approval semantics are therefore runtime validated.

## Stale revision protection

If the selected remote revision is lower than the locally committed revision, a normal pull is blocked with a `STALE_REVISION` alarm. Downgrades require the explicit override.

## Descriptor/manifest consistency

The puller validates descriptor and manifest version/revision equality before activation. From r12 onward it additionally requires a valid immutable `releaseRef` for production descriptors.

## Puller self-refresh

The main puller never overwrites itself while running. It activates the helper, exits, then the helper refreshes `git-pull.js` from the selected release content and commits local deployment state only after that refresh succeeds.

## Validation fixture

`--validation-failure` remains the fixed failed-staging regression mode using `deployment/validation/failure-version.json`. Validation fixtures are branch-based test metadata and are exempt from production `releaseRef` requirements. They may not advance deployment state.
