# References

Use these sources to verify Bitburner API behavior before implementing or fixing API-dependent code. Do not rely on memory when current behavior can be checked.

## Official sources

- Bitburner source repository: https://github.com/bitburner-official/bitburner-src
- Release build: https://bitburner-official.github.io/
- Development build: https://bitburner-official.github.io/bitburner-src/
- Official changelog: https://github.com/bitburner-official/bitburner-src/blob/dev/src/Documentation/doc/en/changelog.md
- Official releases: https://github.com/bitburner-official/bitburner-src/releases

## Authority order

When sources disagree, use this order:

1. Current in-game documentation/API behavior for the installed game version.
2. Current official Bitburner source/type definitions for the relevant release.
3. Official changelog/release notes.
4. This repository's `FIXES.md` and architecture notes.

Project fixes never override newer official API behavior. If a previous fix becomes outdated, mark it superseded in `FIXES.md` instead of silently deleting it.

## Session-start rule

Before implementing or repairing API-dependent behavior, verify the relevant API against current official sources and record material compatibility findings in project docs when necessary.

## Current compatibility note

At project foundation time (2026-09-14), official release history shows Bitburner v3.0.1 as the latest published release, dated 2026-05-17. v3.0.0 introduced major breaking changes including removal of NS1 and several deprecated/renamed APIs. Re-check this note rather than assuming it remains current.
