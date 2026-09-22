# Generic Authority and Work Orders

## Responsibility boundary
Authority answers whether a controller may direct side effects for a typed resource/capability. It does not choose strategy, execute actions, schedule jobs, or allocate RAM/money. Work Orders request outcomes from the controller that already owns a functional domain; they do not duplicate that domain's implementation.

## Authority claims
A claim is structured as resource { kind, id } plus capability. Conflict identity is the exact resource-kind/resource-id/capability tuple. The first slice treats an identical claim as exclusive while different capabilities may coexist on the same resource. Association alone never creates a conflict.

A lease contains lease ID, owner, intent, one or more claims, correlation ID, issue/renew timestamps, and absolute expiry. Acquisition of multiple claims is atomic: any conflict denies the entire request.

## Durable owner and commands
authority-service is the single durable authority owner. data/control/authority.json is truth; the authority port is command transport. First-slice commands are acquire, renew, and release. Commands carry stable request IDs for idempotent decision handling. Expired leases are reconciled from durable state and cannot authorize work.

## Authorization
Direct authorization validates the current durable state, lease identity, owner, claim, and expiry. Missing/malformed state, missing lease, wrong owner, claim outside scope, or expiry returns DENIED. A successful direct check returns DIRECT plus lease/correlation provenance.

## Work Orders and delegation
The Work Order envelope is defined now so authority interfaces do not need redesign later. A work order identifies issuer, receiver, objective, claims, parent authority lease, correlation ID, constraints, timestamps, and lifecycle state: PENDING, ACTIVE, CLOSING, CLOSED, FAILED, or CANCELLED.

A Work Order by itself is not authority. Delegated execution will require the Authority Registry to validate the complete parent-authority -> work-order -> delegate chain. Until that slice is implemented, only DIRECT authorization is executable.

Higher-level systems coordinate domain controllers by outcome. Stock manipulation therefore orders the stock controller and hacking controller; it never trades or hacks itself.

## Revocation / closure design boundary
Normal revocation will be drain-first: stop new objective work, close descendant work orders, permit only bounded cleanup authority where required, then revoke/release. Forced revocation will fail closed immediately. Cooperative handoff, delegated authorization, cleanup authority, and forced revocation are deliberately not implemented in the first direct-lease slice.

## Validation
SAFE m3.authority.direct uses only synthetic owners/resources. It proves atomic grant/denial, capability coexistence, owner/scope fail-closed checks, renewal, release, expiry, durable state validity, and that a valid Work Order envelope does not implicitly create authority. No hacking/trading side effects occur.


## r70 runtime proof
The first direct-authority slice is runtime validated. authority-service joined aggregate Health as the 11th healthy service and SAFE m3.authority.direct passed 13/13. The proof exercised atomic grant/conflict behavior, compatible capability coexistence, DIRECT authorization, owner/scope fail-closed checks, renewal, release, expiry, durable state validity, and confirmed that a valid Work Order envelope alone does not authorize execution.


## Authority restart/recovery validation
DISRUPTIVE m3.authority.restart uses a synthetic claim only. It grants a bounded live lease, captures its issuedAt/expiresAt/owner/correlation/claims, restarts only authority-service, and requires the restarted owner to recover that exact durable lease. Recovery must not renew or extend authority. The recovered lease must still authorize DIRECT use by its owner and deny an identical conflicting claim. The test then waits for the original absolute expiry and proves authorization fails closed. Other persistent services remain running.
