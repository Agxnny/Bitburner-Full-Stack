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

The report records local/remote release identity, pull options, per-file action, aggregate counts, timestamps, success/clean state, errors, and alarms.

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
