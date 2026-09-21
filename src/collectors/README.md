# Observation Collectors

M2 collectors are independent, observation-only persistent services. They do not own canonical game state and they do not perform game actions. M3 may later ingest these snapshots into canonical state.

## Storage contract

`src/core/observation-store.js` writes one replaceable snapshot per domain under `data/observations/<domain>.json`. Every snapshot carries schema version, domain, producer, collection time, freshness deadline, status, optional reason, and domain data.

Current domains are:
- `player` — player money, city, HP, skills/experience, multipliers, factions/jobs and basic access facts.
- `network` — discovered topology plus observational server metadata.
- `market` — stock capability state and, when TIX is available, symbols/prices/bid/ask/spread/position; 4S forecast/volatility only when 4S TIX access exists.
- `infrastructure` — home compute, purchased servers and Hacknet node observations.
- `capabilities` — safe probes for optional mechanics such as Gang, Corporation, Bladeburner and Sleeves.

Market price history is the only initial time-series store: `data/observations/market-history.json`, bounded to 240 samples. Other domains replace their latest snapshot.

## Failure isolation

Each domain is a separate runtime unit/process. A thrown API error degrades only that collector through shared service telemetry; its last snapshot remains available but naturally becomes stale according to `freshUntil`. Other collectors continue.

Locked/unavailable optional mechanics are normal capability data, not suite failures. Market collection explicitly reports `unavailable` while TIX access is absent rather than treating that condition as an error.

`src/collectors/collector-runtime.js` provides the common loop and health reporting but does not aggregate domain execution into one process. This avoids a single collector failure collapsing observation coverage.

## Authority boundary

Collectors may read game APIs and write their own observation files. They may not buy, sell, hack, upgrade, join, travel, spend, schedule work, or otherwise mutate game state. Later controllers consume canonical state/authority interfaces rather than gaining authority from these files.
