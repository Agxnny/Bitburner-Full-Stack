# Deployment

Deployment metadata and bootstrap update behavior live here. Runtime deployment state is protected under `data/` and is never sourced from the repository.

## Release identity

Each deployable release has:
- semantic version: `vX.Y.Z`
- monotonically increasing revision
- immutable revision-specific manifest describing managed files

A revision is immutable once published and must never be reused for different deployable content.

`deployment/version.json` is the mutable freshness pointer. Starting with r8, it must point to a manifest unique to that revision, for example:

`deployment/releases/r8-manifest.json`

Release publication order is:
1. create the immutable revision manifest first
2. verify its version/revision identity
3. update `deployment/version.json` last to point at that manifest

Do not use `deployment/manifest.json` as the manifest target for new release descriptors. That shared file is legacy metadata only and cannot provide cross-request atomicity.

Cache-busting and immutable paths solve different problems. Cache-busting prevents reuse of an old response for the same URL; immutable revision paths prevent a descriptor from one repository propagation state being paired with a later release manifest.

## Pull reporting

`src/bootstrap/git-pull.js` writes the detailed runtime report to:

`data/git-pull-report.json`

The report records local/remote release identity, pull options, descriptor path, per-file action, aggregate counts, timestamps, success/clean state, errors, and alarms.

File actions are:
- `unchanged`: remote content matched local content and no write was required
- `refreshed`: identical content was deliberately rewritten, such as a forced refresh or puller self-refresh
- `updated`: an existing target changed
- `added`: the target did not previously exist

Normal terminal output is intentionally concise and reports release identity, clean/failure status, and the four aggregate file counts.

## Update watcher and approval flow

`src/bootstrap/update-watcher.js` is the persistent release detector and update-command handler.

It:
- polls `deployment/version.json` every 30 seconds with cache busting
- compares the remote revision with `data/deployment-state.txt`
- publishes structured health/update telemetry to `data/update-status.json`
- consumes a bounded single-slot command from `data/update-command.json`
- never installs automatically
- re-fetches the descriptor before accepting an approval
- delegates an accepted approval to `git-pull.js --expect-revision N`
- rejects approval if the requested revision is no longer the current newer remote revision
- rejects approval while another puller process is already active

A decline dismisses the currently presented revision until the next ordinary poll. Runtime network/descriptor failures mark watcher health degraded instead of terminating the persistent watcher.

The minimal React surface is `src/ui/update-dashboard.jsx`. It reads watcher/deployment telemetry and writes commands; it never launches the puller directly.

## Stale revision protection

If the remote revision is lower than the locally committed revision, the normal pull is blocked. The JSON report records a `STALE_REVISION` alarm and terminal output emits an explicit alarm. Downgrades require the existing explicit override flag.

## Descriptor/manifest consistency

The puller validates that the fetched manifest declares the same semantic version and revision as the descriptor. Any mismatch fails closed before activation.

This check caught the r6/r7 mutable-manifest publication race and prevented mixed release contents from being installed. Starting at r8, immutable manifest paths remove that race at the metadata-layout level while the consistency check remains mandatory defense in depth.

## Puller self-refresh

The main puller never overwrites itself while running. It stages and activates the helper, exits, then `git-pull-self-update.js` cache-busts and downloads the puller after the original PID has stopped. Deployment state is committed only after that self-refresh succeeds.

## Validation fixture

`--validation-failure` is a fixed regression-test mode for failed staging/download preservation. It reads only `deployment/validation/failure-version.json`; it is not a general descriptor override.

The fixture manifest stages the two real bootstrap files and then requests `deployment/validation/INTENTIONALLY-MISSING.js`. That file must not exist, so staging should fail before activation.

Safety rules for this mode:
- it may not be combined with `--force`, `--allow-downgrade`, `--expect-revision`, or `--dry-run`
- the descriptor must contain the `staging-failure` fixture marker
- even if every fixture file unexpectedly stages successfully, the puller throws before activation
- validation mode must never advance `data/deployment-state.txt`

Expected test command:

`gp --validation-failure`

Expected result is a `FAIL` line identifying the intentionally missing source. The committed deployment revision and managed bootstrap files must remain unchanged.
