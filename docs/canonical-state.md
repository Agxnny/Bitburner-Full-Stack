# Canonical State

## Ownership

`src/core/canonical-state-service.js` is the single durable writer for canonical game-state domains. Observation collectors publish factual observations; canonical state accepts and reconciles them. Consumers may cache canonical data but may not establish competing truth.

## Domains

Observed domains are `player`, `network`, `market`, `infrastructure`, and `capabilities`. The `associations` domain is derived by the canonical owner from already-canonical network and market state; it is not accepted from observation ports.

## Resource associations

`data/state/associations.json` records factual stock-symbol ↔ organization ↔ server relationships for later authority and coordination.

Market canonical state supplies `symbol` and `organization` using `ns.stock.getOrganization(symbol)`. Network canonical state supplies `hostname` and `organizationName` using `ns.getServer(host)`. A relationship is emitted only when the organization strings match exactly. No fuzzy matching, static lookup table, or guessed relationship is allowed.

The association state records the source network/market revisions and timestamps. Its `observedAt` is the older source timestamp because the derived fact cannot be newer than its least-recent input. If either source is unavailable, the association domain is unavailable. Stocks and organization-bearing servers without a match are retained in explicit unmatched collections.

Associations are facts only. They do not grant authority, imply exclusivity, or decide whether trading and hacking may coexist. Those policies belong to the future shared authority layer.

## Validation

`m3.resource.associations` verifies canonical availability, exact source provenance, timestamp bounding, exact organization equality, source-backed identifiers, unique links, explicit unmatched resources, and that at least one real association is visible in the current runtime.
