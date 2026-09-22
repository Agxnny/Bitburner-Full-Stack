# Diagnostics and Incident Intelligence

## Purpose
Diagnostics is the single durable owner of explanatory incident state. It correlates structured reports with existing health and deployment evidence so the Validation Dashboard can explain failures without becoming a competing source of truth.

## Contract
Producers may publish versioned diagnostic commands on the centrally reserved diagnostics ingress port. A report has a stable incident ID, source, code, severity, message, classification, confidence, optional correlation ID, and bounded evidence. A resolve command closes the same incident explicitly.

Classifications are OBSERVED (direct fact), CORRELATED (joined observed records), and INFERRED (bounded hypothesis). An inference must never be presented as proven root cause. Confidence is low, medium, or high; confidence does not upgrade an inference into an observation.

## Durable state
data/diagnostics/incidents.json is protected runtime state owned only by diagnostics-service. Port traffic is transport, not truth. Repeated identical observations refresh lastSeenAt without flooding state; materially changed recurrence increments the occurrence count. Resolution preserves evidence/history.

## Automatic correlation
The first slice consumes health snapshot evidence and deployment report evidence. Unhealthy/stale services become OBSERVED diagnostic incidents and auto-resolve after healthy state returns. Failed/degraded deployment runtime reconciliation becomes a CORRELATED incident containing release identity, failed runtime units, reported errors, and changed-file evidence when available.

A deployment/runtime correlation may identify the fault domain with high confidence when the deployment report directly identifies a failed runtime unit. It must not claim a syntax error or other root cause unless that evidence was actually captured.

## Validation Dashboard
The Diagnostics tab shows active incident count, classification, confidence, concise explanation, occurrence count, and supporting evidence. The dashboard only presents durable diagnostics state.

## Validation
SAFE m3.diagnostics.intelligence publishes synthetic evidence, verifies durable ownership/classification/deduplication, and resolves the fixture. It performs no production side effects.


## Controlled real-failure validation
DISRUPTIVE m3.diagnostics.failure-correlation uses a validation-only service fixture. The fixture first reports healthy, then deliberately remains alive while withholding its own heartbeat until health marks it stale. The test requires diagnostics to create an OBSERVED SERVICE_STALE incident containing service/PID health evidence and no invented root cause. The fixture then resumes heartbeat; health must recover and diagnostics must automatically resolve the incident while retaining evidence. Production services are not stopped by this test.


### r68 validation note
The real failure/recovery assertions passed 8/8, including automatic incident resolution after heartbeat recovery. Test teardown then exposed a lifecycle gap: killing a validation-only producer leaves its last health instance registered, so Health later marks that retired fixture stale again. The corrective design must explicitly retire ephemeral validation service instances rather than treating silence after teardown as failure.


## Intentional service retirement
Ephemeral or validation-only service instances must explicitly publish a service-retirement telemetry record before exiting normally. The Health owner removes only the exact matching instance ID and records informational SERVICE_RETIRED evidence. Silence without retirement remains a failure signal and will still become stale. This prevents intentional teardown from being confused with a crashed service.


### r69 closure proof
Validation version 2 passed 10/10 including fixture-retired and teardown-clean. After the stale window, Health remained healthy with 10 production services and no validation fixture in active placement; Diagnostics had no active incidents. Historical failure evidence remains retained in Recent Incidents / Recently Resolved by design.
