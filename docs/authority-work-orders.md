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


## Delegated execution slice
work-order-service is the single durable owner of Work Order lifecycle state. Creation is a command, not an authority transfer: the service reads current durable Authority state and activates an order only when the issuer currently owns DIRECT authority for every requested claim and the correlation ID matches the parent lease. Order expiry is capped to the parent lease expiry.

At execution time, delegatedAuthorization validates both durable owners again. It requires an ACTIVE unexpired order, the exact named receiver, an in-scope claim, a present unexpired parent lease still owned by the issuer, matching correlation, and current DIRECT authorization of the parent claim. Success is explicitly DELEGATED. Parent release/expiry therefore invalidates delegation immediately even if the Work Order has not yet reconciled its own lifecycle. Closing an order also denies new delegated work. This slice does not provide cleanup authority after closure; drain-first revocation remains the next lifecycle slice.


## Delegated execution slice
work-order-service is the single durable owner of Work Order lifecycle state. Creation does not transfer authority: activation requires the issuer to hold current DIRECT authority for every requested claim, with matching parent correlation. Order expiry is capped to parent lease expiry.

At execution time, delegatedAuthorization checks both durable owners again. It requires an ACTIVE unexpired order, exact receiver, in-scope claim, and a current parent lease still owned by the issuer with matching correlation and scope. Success is DELEGATED. Parent release or expiry invalidates delegation immediately even before Work Order lifecycle reconciliation. Closing an order denies new delegated work. Cleanup authority remains a later slice.


## Drain-first closure and cleanup
Normal close is no longer synonymous with immediate CLOSED. The durable owner transitions ACTIVE -> CLOSING and sets a fixed cleanup deadline. DELEGATED authorization requires ACTIVE, so no new objective work can start once closure begins. A separate cleanupAuthorization may return CLEANUP only to the order's named receiver, only for claims already present on the order, and only before cleanupExpiresAt. It deliberately does not require the parent lease to remain present, allowing bounded unwind after revocation without restoring ordinary authority.

CLEANUP is an authorization classification, not an executable operation. Domain executors are responsible for exposing narrowly defined cleanup-only behavior (for example cancelling queued work, draining already-launched jobs, or reducing/closing an existing position) and must never treat CLEANUP as permission to run their normal objective path. The cleanup window cannot renew itself or create child work. The receiver acknowledges successful unwind with complete, producing CLOSED and removing cleanup authorization early. Forced cancel produces CANCELLED immediately with no cleanup. If the cleanup deadline expires without completion, the Work Order becomes FAILED and all cleanup authorization ends.


## Real delegated execution validation fixture
The first non-synthetic consumer is intentionally validation-only rather than a hacking subsystem. DISRUPTIVE test m3.authority.real-weaken reads canonical network state, selects one rooted non-home non-purchased server whose current security is above minimum, acquires server hacking-control authority, creates one bounded weaken-once Work Order, and launches a temporary one-thread executor. The executor has no DIRECT lease and revalidates DELEGATED authorization immediately before calling ns.weaken(). The controller then drain-closes the order, releases authority, and verifies that no executor process or live test lease remains. This fixture establishes integration behavior only; it introduces no persistent hacking service, target strategy, scheduler, batching, rooting, or production dashboard.


### Validation fixture placement rule
The one-shot real delegated execution fixture is explicitly launched on `home` because this integration proof reads the durable Authority and Work Order control files directly. Dashboard placement is not an execution-placement contract: a validation dashboard may run on another host, so validation children must not inherit its host accidentally. Future production executors intended to run remotely must consume authority/work-order state through an explicit supported transport or replicated read model rather than assuming `ns.read()` can read a file from another server.


### Claim construction rule
Authority consumers must construct claims through the shared `authorityClaim(kind,id,capability)` contract helper (or consume an already validated claim) rather than manually reproducing its object shape. The canonical claim shape is `{resource:{kind,id},capability}`. Delegated authorization reports invalid authority state, Work Order state, claim, and time inputs as distinct denial reasons so integration failures remain explainable.


### Real-action validation lifetime rule
A real executor test must size its bounded parent lease, Work Order, and observation timeout from the measured duration of the selected game operation. The real-weaken fixture only selects eligible canonical targets whose current weaken time fits safely inside the existing five-minute Authority/Work Order ceiling; it does not lengthen the core authority limits for the test.
