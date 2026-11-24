# Capability classification

Three independent dimensions are recorded per individual task.

## Automation
- Full automation: independent execution.
- Assisted automation: player interaction required.
- Monitoring only: observation and reporting.
- Out of scope: deliberately excluded.
- Undecided: not yet assessed.

## Execution
- In-game: Netscript or supported in-game execution.
- External: companion computation using available data.
- Hybrid: external processing and in-game action/data collection.
- Manual: direct player interaction.
- Undecided: no location selected yet.

Either is a candidate marker meaning both locations are feasible, not a final assignment. External preferred is a provisional preference.

## Companion dependency (proposed)
- Standalone: works without the app.
- Enhanced: works independently, improves when connected.
- Dependent: requires the app.
- External only: no in-game implementation intended.
- Undecided.

## Task record
Stable ID; parent domain; description; automation; feasible execution locations; selected execution; dependency; API/functions and version evidence; unlock gates; resource conflicts; acceptance criteria; decision status.

Example: calculating batch sizes can be external or in-game; executing hack/grow/weaken must be in-game. An externally calculated batch executed in-game is hybrid. These examples do not lock implementation.
