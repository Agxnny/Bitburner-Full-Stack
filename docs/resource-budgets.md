# Resource Budget Manager

## Ownership
`resource-budget-manager` is the single durable owner of logical consumption envelopes for divisible shared resources. The subsystem now implements RAM ceilings and money allocation/reservation accounting.

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

## Money contract
Money uses the same port and durable Budget Manager state. `set-money` establishes one durable logical ceiling for an owner. It does not spend or lock actual player money.

Before a future spending executor performs a transaction, it must obtain a named money reservation. RESERVED amounts immediately reduce available logical capacity. An unspent reservation may be RELEASED, restoring that capacity. A successful transaction is represented by SETTLED state; settlement adds the actual amount (which may be lower than the reservation but never higher) to the allocation's durable `spent` total. An allocation cannot be lowered below already spent plus currently reserved capacity and cannot be retired while live reservations remain.

Budget Manager performs accounting only. It does not call purchasing/trading APIs and does not grant target Authority. Real production spending remains blocked until an executor integration also reconciles budget accounting with canonical player-money observations/manual player actions.

## Deferred
Real spending integration and canonical-money reconciliation, distributed host policy, dynamic allocation policy, priorities/preemption, operator controls, and Production Dashboard presentation remain future work.

## Validation
SAFE `m3.budgets.ram` uses synthetic Authority/Work Order state and the harmless execution fixture. It proves durable allocation, missing/over-budget fail-closed admission, in-budget scheduler launch attributed to the budget owner, active usage accounting, reservation retirement, and reuse of returned capacity.

SAFE `m3.budgets.money` uses synthetic dollar amounts only. It proves missing-budget denial, allocation, reservation, over-budget denial, release/returned capacity, settlement into spent accounting, unchanged actual player money, and clean allocation retirement.
