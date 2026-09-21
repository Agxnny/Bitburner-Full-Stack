# Bitburner Full Stack

A modular, centrally governed Bitburner automation stack.

## Project principles

- GitHub is the permanent source of truth for code, architecture, decisions, fixes, working changes, and handoff state.
- Chat is for reasoning and decisions; implementation code should live in the repository.
- Shared resources and contested decision domains are governed centrally.
- Core services expose structured telemetry for React production and validation dashboards.
- Features move through design, implementation, validation, documentation, and completion in order.
- In-progress work is preserved in `CHANGES.md`, and feature documentation is updated whenever feature behavior changes.

## Start here

Future development sessions should read these documents before making changes:

1. `PROJECT_RULES.md`
2. `CHANGES.md`
3. `CURRENT_STATE.md`
4. `ARCHITECTURE.md`
5. `DECISIONS.md`
6. `ROADMAP.md`
7. `FIXES.md`
8. `REFERENCES.md`

Before relying on any Bitburner API behavior, verify it against the current official documentation/source referenced in `REFERENCES.md`.

## Current milestone

**M1 — Reliable Deployment**

Reliable deployment, updater lifecycle, update UI, and validation behavior are being completed before the project advances to later control-plane milestones.


## Explicit managed-file retirement

Deployment manifests may explicitly retire obsolete managed source files with `retireFiles`. Removing a path from the normal `files` list is never deletion authorization.

Retirement is fail-closed. After new ownership code is active and persistent runtime reconciliation has removed relaunch behavior, the self-update helper finds any process whose script path matches the retired file, closes its tail, requests termination, waits, and verifies the script is no longer running. A file is deleted only after that verification succeeds, and deletion is followed by an absence check. A stop/verification failure preserves the file and degrades the deployment result.

The puller rejects protected/unsafe retirement paths, duplicate retirement paths, bootstrap puller/helper retirement, and a path that is simultaneously active and retired. Runtime data under `data/` remains protected.

Every requested retirement is auditable in terminal output and `data/git-pull-report.json`. Results distinguish `already-absent`, successful `retired`, and `failed`, and include matching/stopped PIDs and failure reasons. Retirement declarations are release-specific instructions rather than permanent tombstones.
