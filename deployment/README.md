# Deployment

Deployment metadata and bootstrap update behavior live here. Runtime deployment state is protected under `data/` and is never sourced from the repository.

## Release identity

Each deployable release has:
- semantic version: `vX.Y.Z`
- monotonically increasing revision
- manifest describing managed files

A revision is immutable once published and must never be reused for different deployable content.

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

## Stale revision protection

If the remote revision is lower than the locally committed revision, the normal pull is blocked. The JSON report records a `STALE_REVISION` alarm and terminal output emits an explicit alarm. Downgrades require the existing explicit override flag.

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
