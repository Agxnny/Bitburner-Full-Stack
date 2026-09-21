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
