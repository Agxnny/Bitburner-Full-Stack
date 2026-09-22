# Execution Scheduler

## Ownership
The persistent `execution-scheduler` is the only owner of managed compute placement and execution leases. Controllers request outcomes through Work Orders and request compute through the scheduler; they do not call `ns.exec()` for managed production work.

The scheduler does not choose targets or strategy, grant game-resource authority, or own subsystem RAM budgets.

## First-slice contract
Commands use port 9. Durable state is `data/control/execution-scheduler.json` and is protected runtime data.

A request binds `executionId`, `workOrderId`, receiver, correlation ID, script, thread count, arguments, and bounded TTL. Admission requires the referenced Work Order to be ACTIVE with the same receiver/correlation. Request IDs are idempotent at the command-decision boundary and execution IDs cannot be reused.

The first placement policy is intentionally narrow: FIFO, bounded queue, one host per execution, `home` only, no preemption. The scheduler obtains script RAM from Netscript, keeps an 8 GB home reserve, and rechecks actual free RAM immediately before launch. Distributed placement and configurable reserves are later work.

## Lifecycle
`REQUESTED → RESERVED → RUNNING → DRAINING → COMPLETE`.

Terminal alternatives are `FAILED`, `CANCELLED`, and `EXPIRED`. RAM is considered reserved only for RESERVED/RUNNING/DRAINING records and is not released conceptually until the managed process is gone or explicitly terminated.

If the Work Order stops being ACTIVE while its process is still running, the scheduler enters DRAINING and starts no replacement work. Absolute execution expiry terminates a still-running managed process. Explicit cancellation by the named receiver terminates the process.

## Restart and reconciliation
State is durable. Startup reconciles records before normal admission. A durable RUNNING record whose exact PID is still running on its recorded host is retained without extending expiry. A missing process becomes terminal. The scheduler never blindly relaunches a durable RUNNING record.

## Validation
The first SAFE validation uses a synthetic Authority lease and Work Order plus a harmless short-lived executor. It proves binding, managed launch attribution, duplicate/idempotent request behavior, process completion and reservation retirement. A separate restart proof and conversion of the real-weaken fixture to scheduler launch follow after the base contract passes.


## Controlled restart validation
After the base contract is proven, DISRUPTIVE `m3.execution.restart` runs one harmless six-second scheduler-managed fixture, records its execution PID and absolute expiry, restarts only `execution-scheduler`, and verifies durable reconciliation recovers that exact still-running child. The test requires no duplicate fixture launch and no expiry extension, then waits for natural child exit and verifies the recovered execution becomes COMPLETE and no longer reserves RAM. The fixture restores the scheduler if the controlled test path fails.
