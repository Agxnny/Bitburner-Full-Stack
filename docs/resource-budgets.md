# Resource Budget Manager

## Ownership
`resource-budget-manager` is the single durable owner of logical consumption envelopes for divisible shared resources. The first vertical slice implements RAM only.

A RAM budget answers: **how much managed RAM may this owner consume?** It does not answer where work runs, whether a target may be acted on, or which process currently consumes RAM.

Execution Scheduler remains the owner of physical placement and active RAM reservations. Authority remains the owner of target permission.

## RAM contract
Commands use port 10. Durable state is `data/control/resource-budgets.json` and is protected runtime data.

`set-ram` creates or updates one durable allocation for one owner. An owner may have one RAM allocation and an allocation ID cannot be reused by another owner. Limits are positive bounded GB values. `release-ram` is owner-bound and idempotent when already absent. Request IDs are idempotent at the decision boundary.

First-slice allocations are explicit durable ceilings, not expiring leases. Dynamic policy and automatic allocation are later work.

## Scheduler enforcement
Every managed execution request names `budgetOwner`. Execution Scheduler fails closed if no RAM allocation exists. It calculates current usage only from its own active RESERVED/RUNNING/DRAINING execution records for that owner. A request is denied if current usage plus requested script RAM exceeds the allocation.

The scheduler checks the ceiling when accepting the request and again immediately before launch. Physical host RAM remains a separate admission constraint. Terminal execution records do not count as active usage, so capacity automatically becomes reusable without a second usage ledger.

Budget release prevents subsequent admission. Existing managed work is not retroactively re-owned by Budget Manager; scheduler lifecycle remains responsible for its process and reservation retirement.

## Deferred
Money budgets, distributed host policy, dynamic allocation policy, priorities/preemption, operator controls, and Production Dashboard presentation are outside this first slice.

## Validation
SAFE `m3.budgets.ram` uses synthetic Authority/Work Order state and the harmless execution fixture. It proves durable allocation, missing/over-budget fail-closed admission, in-budget scheduler launch attributed to the budget owner, active usage accounting, reservation retirement, and reuse of returned capacity.
