# Project scope

Baseline: 2026-11-24. Target: Bitburner 3.0.1. Clean-sheet development in a public repository.

## Objectives
Catalogue gameplay and technical capabilities before choosing architecture. Design an in-game automation stack and evaluate companion application responsibilities. Maintain version-specific API compatibility and traceability from requirements to implementation and tests.

## Proposed engineering principles
Modular responsibilities, RAM-aware operation, configurable strategies, resource coordination, failure recovery, automated validation and tests, and verified releases. These are proposals, not architectural commitments.

## Resource competition
Personal money: augmentations, stocks, Hacknet, servers, training and equipment. RAM: hacking, sharing, Stanek, Darknet and automation. Player activity: crime, training, work and grafting. Sleeve activities compete per sleeve. Hashes have competing uses. Faction reputation, corporation funds, gang resources, Bladeburner skill points and time require separate accounting. Avoid independent controllers interrupting mutually exclusive activities.

## Boundaries
No inherited code. No implementation or architecture selected yet. Manual-only gameplay is eligible for decision support, not assumed to be directly automatable. No requirement to implement every catalogue item. Public standard GitHub-hosted runners may be used for CI; premium resources may incur charges.


## Shared dataset policy (D15 — Locked)
Where technically practical, maintain shared datasets for information consumed by multiple systems rather than duplicating collection. Applies to in-game and companion responsibilities. Identify data ownership, freshness, refresh and invalidation requirements; allow direct live queries when cached data is insufficient. This does not mandate a database, central process, storage format or transport. Candidate datasets include network, player, computing resources, finances, factions, augmentations, unlocks, processes, stocks, corporation, sleeves and Darknet.
