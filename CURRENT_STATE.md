# Current State

## Current milestone
**M0 — Project Foundation**

## Status
Governance and architecture are established. No gameplay automation implementation has started yet.

## Completed
- Repository initialized.
- Project rules established.
- Broad architecture locked.
- Implementation roadmap established.
- Core decisions recorded.

## Active feature
Repository/governance foundation only.

## Next feature
**M1 — Reliable Deployment**

Design and implement:
- bootstrap git-pull utility
- deployment manifest
- update watcher
- staged/validated deployment
- persistent runtime-unit protection
- update telemetry

## Locked architectural constraints
- Centralized canonical state.
- Central Resource, Authority & Budget Manager.
- Central scheduler and controlled execution paths.
- Controllers decide; executors perform side effects.
- React Production and Validation dashboards are first-class clients.
- Persistent runtime units receive special update protection.
- Repository is permanent project memory; avoid code dumps in chat.

## Known issues
None yet.

## Do not work on yet
Do not begin hacking, stocks, purchased servers, progression, or other domain automation until earlier roadmap foundations are completed and validated.

## Handoff instructions
A fresh development chat should read `PROJECT_RULES.md`, this file, `ARCHITECTURE.md`, `DECISIONS.md`, `ROADMAP.md`, and relevant `FIXES.md` entries before making code changes. Verify Bitburner API assumptions against `REFERENCES.md` and current official documentation/source.
