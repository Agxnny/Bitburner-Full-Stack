# Core

Persistent control-plane services and shared contracts: supervisor/service registry, state service integration, Resource/Authority/Budget Manager, scheduler, executor, messaging, telemetry, and health infrastructure.

## M2 telemetry ownership

`src/core/health-collector.js` is the single owner of aggregate service-health storage on `home`. Producers publish through `src/core/telemetry.js`; consumers read the aggregate snapshot rather than creating competing health truth.

Telemetry is not canonical game state. Service health, heartbeat, runtime placement, incidents, and operational phases belong here. Observed player/server/game state belongs to the M3 canonical state service.

Telemetry ingress uses global Netscript port 1 so future services may report from any host. The collector writes protected runtime data:
- `data/telemetry/health.json` — latest aggregate health and observed placement
- `data/telemetry/incidents.json` — bounded recent warning/error/recovery history

A health record identifies stable service ID, per-process instance ID, hostname/PID, lifecycle, reported health, heartbeat/stale threshold, and optional phase/reason/details. If a producer stops reporting beyond its stale threshold, the collector derives `stale`.

Observed host/PID is reporting data only. For the M2 singleton-service model, a newly reporting instance with the same stable service ID supersedes the prior active instance. The old host/PID is removed from active health/placement immediately while stale and replacement/recovery incidents remain bounded history. This prevents legitimate restarts or relocations from leaving phantom stale services. M4 Supervisor will later own desired placement, launch/restart policy, duplicate/orphan reconciliation, and startup ordering.

Meaningful warnings, errors, health transitions, stale transitions, and recoveries are retained in bounded history. Warning/error retention is unique by stable service ID plus incident code: a newer occurrence replaces the older retained occurrence of the same operational incident, while different codes and different services remain distinct. Existing incident storage is normalized through this rule when the collector starts. Recovery/info records remain bounded history. Routine healthy heartbeats are not appended. Malformed telemetry is rejected, counted, and surfaced as a warning.

The collector reports itself. The update watcher is the first external real producer. `src/ui/system-health-dashboard.jsx` is the first consumer and remains a lightweight alarm/status surface rather than the full Validation Dashboard.

### Runtime validation

The first validation proves the collector and update watcher appear with actual host/PID, settle healthy, watcher loss becomes stale, watcher restart recovers, bounded incidents survive, and the dashboard uses shared geometry memory.
