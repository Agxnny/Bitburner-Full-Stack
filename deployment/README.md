# Deployment

This directory contains version-controlled deployment metadata. Runtime deployment state belongs inside Bitburner's protected `data/` area and is never deployed from this directory.

## Current schema

`version.json` is the small remote freshness descriptor. It exposes:
- deployment schema version
- semantic version (`vX.Y.Z`)
- monotonically increasing revision
- path to the deployment manifest

`manifest.json` lists repository source paths and their Bitburner target paths for the current revision.

## Version and revision rules

- Semantic version communicates release meaning.
- Revision is the authoritative freshness/update sequence.
- Revisions only increase.
- Once a revision has been released/deployed, its deployable content is immutable.
- Any later deployable change requires a new revision.
- Automatic downgrade is prohibited.

## Cache busting

The bootstrap puller adds a unique cache-busting query to the remote version descriptor and revision-scoped cache-busting values to manifest/file downloads. The self-update helper also uses a unique cache-busted request when refreshing `git-pull.js` after the running puller exits.

## Protected state

Manifest targets may not write into `data/`. Local deployment state and pending deployment state are runtime data and remain outside version control.

## Pending M1 extensions

The manifest will later gain runtime-unit classification, content/runtime-unit hashes, persistence policy, and explicit retirement metadata before persistent services depend on the deployment system.
