# Production Dashboard

## Status
**Information architecture approved and locked. Visual/layout design is next; runtime implementation has not started.**

This document owns the Production Dashboard feature contract. It records what the operator-facing dashboard presents and controls without defining future controller algorithms.

## Purpose and boundary

The Production Dashboard answers **“what is production doing?”** It is a React consumer of canonical state, domain telemetry, budgets, supported configuration, and standard command interfaces.

It is not a source of canonical truth, controller logic, authority, scheduling, budgeting, execution, diagnostics, or validation evidence. It may show concise controller-provided reasoning such as “forecast reversed” or “spare RAM available; next-ranked viable target,” but it must not expose internal formulas, decision trees, Work Orders, leases, scheduler records, or debug traces.

The Validation Dashboard remains the engineering/diagnostic surface for correctness, health detail, invariants, authority conflicts, queue/execution evidence, and root-cause investigation.

## Navigation

Permanent tabs:

- **Overview**
- **Hacking**
- **Stocks**
- **Stock Manipulation**
- **Network**
- **Progression**
- **Settings**

Capability-dependent tabs appear when their systems exist and are relevant:

- **Hacknet**
- **Sleeves**
- **Gang**
- **Bladeburner**
- **Corporation**
- Later BitNode-specific controllers

Network owns both discovered/rooted network presentation and purchased-server fleet presentation; Purchased Servers is not a separate top-level tab.

The dashboard uses the same compact tab language as Validation. Capability tabs may be absent rather than occupying empty permanent navigation space.

## Shared lifecycle controls

Every controllable production domain exposes the same lifecycle intents through normal command pathways:

- **Start** — available when the domain is stopped.
- **Graceful Stop** — admit no new objective work, drain/clean up bounded in-flight work, release resources/authority as appropriate, then stop.
- **Hard Stop** — immediately stop that domain's non-persistent managed production work and retire/cancel outstanding work as safely as the domain contract permits.
- **Restart** — graceful stop followed by start. A failed or bounded shutdown is reported; Restart does not silently escalate to Hard Stop.

Hard Stop and Restart require deliberate operator interaction/confirmation. Domain lifecycle controls do not bypass the normal authority/budget/command architecture.

### Global ESTOP

Overview exposes a prominent, confirmed, **latched ESTOP**.

ESTOP:
- immediately prevents/retires non-persistent production activity;
- prevents automatic production restart while latched;
- leaves the persistent control plane alive so the operator can observe and recover the system;
- cannot stop, restart, replace, or retire persistent runtime units.

Persistent lifecycle mutation is reserved to the updater/deployment path and explicitly authorized disruptive validation/tests. Normal Production Dashboard controls, including ESTOP, never cross this boundary.

## Overview

**Visual/layout status: APPROVED.** The first Overview render is the visual baseline for the remaining Production Dashboard tabs.

Overview is the compact whole-stack operational summary and uses the established compact dark grey-blue dashboard language.

### Approved physical hierarchy

1. **Dashboard header** — `FULL STACK — PRODUCTION DASHBOARD`, release/milestone context, online state, and an isolated prominent red **ESTOP** control at the upper-right.
2. **Primary tab bar** — same compact button/tab family as Validation, with Overview selected.
3. **Top KPI row** — five compact cards for **Money**, **Managed RAM**, **Income**, **System Health**, and **Production State**. Cards favor the primary value/status first, with only concise supporting detail.
4. **Operational middle row** — **Attention** on the left and **Current Activity** on the right. Attention contains only actionable production-impacting items with direct Review/View navigation. Current Activity summarizes what each available production domain is doing now, including concise state/progress where meaningful.
5. **Subsystem summary row** — compact clickable cards for **Hacking**, **Stocks**, **Stock Manipulation**, **Network**, and **Progression**. Each card exposes only the small set of domain metrics needed to understand current production and provides direct navigation to that tab.
6. **Low-priority utility/footer area** — bounded recent production events and other compact operator conveniences may occupy the bottom when useful, but must remain visually subordinate to production state and must not become a second Validation/diagnostics surface.

The approved render establishes the target density, card/border treatment, typography hierarchy, cyan/teal/green operational accents, warning/error emphasis, tab proportions, and general Production Dashboard visual language for subsequent tab renders.

### Information contract

Overview presents:
- player money;
- managed RAM used/reserved/free;
- overall production income/performance where meaningful;
- a small aggregate health indicator;
- global production state such as ACTIVE, DRAINING, or ESTOP ACTIVE;
- production-relevant attention items;
- current activity by domain;
- compact clickable summaries of each available production tab.

Attention items route to the relevant tab when possible. Overview does not duplicate Validation's service lists, detailed health evidence, freshness/invariant views, scheduler queues, authority leases, Work Orders, or diagnostics.

Overview is designed for the large workspace normally to the right of Validation. Its size remains dashboard-owned and content-driven; its placement uses the existing sizing/docking coordinator rather than fixed screen coordinates.

## Hacking

**Visual/layout status: APPROVED.** The accepted Hacking render follows the Overview visual baseline and is now the reference layout for this workspace.

### Approved physical hierarchy

1. **Shared dashboard header and tab bar** — retain the approved Production shell, with Hacking selected and the global ESTOP isolated at upper-right.
2. **Primary operational row** — compact cards for **Hacking Mode**, **Hacking Status**, **Current Target**, **Hacking Performance**, and **Resource Usage**. This row answers what mode is active, whether the controller is working, what it is targeting, what it is producing, and how much compute it is consuming.
3. **Primary detail row** — **Target Details**, **Batch Information**, and **Target Selection**. Target condition and timing remain separate from execution/batch summary, while selection exposes only concise operator-facing reasoning and useful alternatives.
4. **Preparation/capacity row** — **Target Preparation**, **Opportunistic Work / Spare RAM**, and a compact opportunity/candidate list where useful. This makes secondary use of capacity visible without competing with the primary target.
5. **Supporting footer** — bounded recent production events and useful Hacking actions may sit below the operational panels, but remain subordinate to the controller state.

The approved render establishes a dense but readable Hacking workspace: primary operating state first, target/execution reasoning second, preparation/spare-capacity behavior third.

### Information and control contract

#### Primary production
Show:
- operational mode, including player-facing **Money / XP** selection;
- operational state such as Selecting, Preparing, Running, Draining, Paused, or Waiting for RAM;
- current target full name when one target is active;
- compact/abbreviated target labels for multi-target operation with full-name access;
- current/max target money and percentage/progress;
- current security relative to minimum;
- in-flight workers and, when applicable, batches;
- next significant completion and drain/all-clear ETA;
- performance as $/s in Money mode or XP/s in XP mode;
- concise target-selection reason;
- managed RAM/worker usage relevant to Hacking.

The mode selector is immediate operational intent and belongs on Hacking, not Settings. Domain lifecycle controls must use the shared Start/Graceful Stop/Hard Stop/Restart contract; visual labels such as Pause/Stop in mockups do not create a second lifecycle API.

#### Target details and batching
Target detail may show useful operator facts such as required/current hacking level, minimum/current security, maximum/current money, growth, and relevant action timing.

Batch presentation may show the active HGW/HWGW strategy, thread composition, total/in-flight work, batch count, duration, next completion, and a compact timing sequence. Advanced batching may add richer pipeline state later without changing the tab's hierarchy.

Target-selection presentation may show the current concise reason, evaluation age, and useful alternative targets/rankings. Internal scoring formulas and controller decision traces remain outside Production.

#### Target preparation and recovery
A dedicated compact area shows targets being prepared or recovered:
- target;
- prep/recovery state;
- money condition;
- security condition;
- committed workers/RAM;
- ETA.

Preparation may use spare capacity for likely future targets and does not imply that every prepared server must become a production target. The workspace may show current-target preparation as completion/progress plus a compact multi-target prep list when multiple candidates are active.

#### Spare RAM / opportunistic work
Summarize RAM assigned to:
- primary production;
- target preparation/recovery;
- XP or other supported opportunistic work;
- policy reserve;
- genuinely free RAM.

When useful, explain why capacity is idle, for example “no eligible prep targets” or “reserved by policy.” Candidate/opportunity lists may show where spare capacity could be directed when that feature is enabled. Internal target-scoring logic remains outside Production.

#### Supporting activity/actions
Recent Events is bounded to meaningful Hacking production changes/completions rather than scheduler/debug noise. Quick actions, if exposed, must route through supported controller commands and never bypass authority, budgets, Work Orders, or the Execution Scheduler.

## Stocks

**Visual/layout status: APPROVED.** The accepted Stocks render establishes the chart-dominant, high-density trading workspace. Placeholder real-world ticker names, values, news, and illustrative controls in the mockup are not part of the contract; runtime presentation uses Bitburner market symbols/data and only supported trader commands/configuration.

### Approved physical hierarchy

1. **Shared dashboard header and tab bar** — retain the approved Production shell, Stocks selected, and global ESTOP isolated at upper-right.
2. **Trading summary row** — compact cards for **Trader Status**, **Trading Capital / Portfolio Value**, **Performance**, **Position Limits / Exposure**, and **Market State**. The final labels/data follow the canonical trader contract rather than mockup placeholders.
3. **Primary workspace** — a large **Symbol Chart** dominates the left/center; a compact **Forecast / Opportunities** panel occupies the right. Symbol and timeframe controls remain attached to the chart.
4. **Portfolio/performance workspace** — **Open Positions** receives the primary table; recent closed outcomes/performance sit beside or below it. The approved information model keeps winners/losers/flats and performance history available without overwhelming the chart.
5. **Trader policy/status area** — supported trading configuration and limits may be visible in a compact side panel, but implementation must use the Settings/configuration contract and standard trader command path. Mockup sliders/toggles are illustrative, not automatic approval of arbitrary runtime controls.
6. **Supporting footer** — bounded meaningful trade activity and useful operator actions may occupy the bottom. Generic real-world market news from the mockup is not part of the Bitburner Production Dashboard contract.

The Stocks tab is expected to be one of the widest Production states. Dynamic sizing remains dashboard-owned and the existing docking coordinator preserves its relationship to Validation.


Stocks is the trader/operator workspace. The stock trader remains the sole trade execution path, including trades requested by Stock Manipulation.

### Price chart
The chart has:
- selectable symbol;
- **5m / 15m / 30m / 1h / 4h / Historical** views;
- OHLC candles for bounded time views;
- progressively more visible candles as the selected timespan grows, while candle duration also increases;
- a separate full-known-history presentation that may use coarser adaptive aggregation;
- actual position open/close markers;
- a right-edge current-price tag.

Raw market observations are timestamped at observation time using the shared wall-clock semantics and remain the durable historical basis. Candle membership is deterministic from fixed wall-clock buckets for a chosen resolution. Samples never slide between candles as the visible window advances. Completed candles are immutable.

The forming candle is grey. Historical incomplete candles use a distinct presentation so grey has only the live/forming meaning.

Collection gaps are factual missing-data intervals. They are shown as empty elapsed-time space bounded by dashed orange start/end markers. No candle, line, interpolation, or inferred price bridges a gap. Gap metadata may show known start/end/duration and only a known cause; unknown causes remain unknown.

The current-price tag always represents the latest actual observation. When observations become stale, it freezes at the last observed level and visibly becomes STALE until a new observation arrives.

Exact candle durations/counts are presentation policy to be finalized against the production market collection cadence; the immutable timestamp-bucket rule is architectural.

### Portfolio
Open positions only. Each row shows:
- symbol;
- LONG/SHORT;
- shares;
- entry price;
- current observed price;
- unrealized P&L in money and percent;
- current forecast score.

Rows select that symbol in the chart. Stale current prices are explicit. Closed positions belong to performance/history rather than the open portfolio.

### Money and performance
Show:
- allocated trading capital;
- available trading capital;
- invested capital;
- current portfolio value;
- realized P&L;
- unrealized P&L;
- total P&L;
- return percentage.

Player cash and trader-allocated capital remain distinct.

A compact performance graph shows realized P&L as the primary series with total P&L (realized + unrealized) available alongside it. Useful time ranges may include 1h, 4h, 12h, 24h, and Historical.

Compact statistics may include trades, wins, losses, flats, win rate, average win/loss, best/worst trade, and profit factor when meaningful.

Recent closed positions are separated into **Winners** and **Losers**. **Flat** positions close normally, count as valid outcomes, and appear in a smaller side summary rather than a third full column. Closed-position detail may expose entry/exit, shares, timestamps/duration, realized P&L, and concise recorded entry/exit reason.

### Forecast / opportunities
Show separate strongest **Long** and **Short** rankings.

Raw forecast has stable meaning:
- 0.50 = neutral;
- above 0.50 = upward expectation;
- below 0.50 = downward expectation.

Do not invert the displayed short forecast. Forecast remains distinct from any future **opportunity score**, which may incorporate additional trader policy. Only show a confidence measure if the system can defend its meaning.

Rows may show:
- symbol;
- forecast;
- opportunity score when implemented;
- strengthening/stable/weakening opportunity state;
- current-position indicator;
- signal-reversal warning.

Clicking a row selects the chart symbol. Default presentation may show a bounded top set in each direction with an expandable full market and a compact neutral count.

### Trader status and activity
Keep reasoning intentionally shallow:
- current trader state;
- latest meaningful action;
- one short “why” statement.

Do not print full reasoning traces. Recent activity is a bounded chronological feed of meaningful trade actions only; do not fill it with scans, HOLD decisions, heartbeats, or internal control-plane events.

### Position limits and exceptional exposure
The normal position cap limits how much may be committed to one position, but is a ceiling rather than a desired size. The trader's strategy may choose a smaller position.

Supported configuration may combine percentage and absolute limits, with the effective normal ceiling determined by policy.

A coordinated system such as Stock Manipulation may request an exceptional exposure override. An override must be:
- scoped to the relevant symbol/direction;
- bounded by a maximum permitted exposure;
- attributable to the requesting operation/correlation;
- temporary/expiring;
- visible in Production while active.

An override never bypasses the trader's total money budget and never authorizes the manipulation controller to execute trades directly. Expiry/removal prevents further exceptional increases; disposal of an already-oversized position follows the coordinated operation/trader lifecycle rather than an implicit forced sale.

## Stock Manipulation

The manipulation workspace shows the active/selected coordinated operation without exposing its internal strategy.

Show:
- symbol/company;
- PUMP/DUMP direction;
- operation phase and elapsed time;
- concise selection reason;
- **true position versus desired position**, preferably with compact progress;
- normal position cap and active manipulation override;
- current stock price;
- current forecast and movement since operation start;
- associated server;
- server money/max and security/min condition;
- committed hacking workers/RAM;
- in-flight manipulation work;
- ETA;
- current position P&L;
- manipulation-attributed result/P&L where attribution is defensible.

The lifecycle should be readable as **Acquiring → Manipulating → Exiting → Complete**.

The UI may later select among multiple operations without requiring the first controller implementation to support concurrent manipulation.

## Network

Network combines discovery/rooting and purchased-server capacity.

### Network summary
Show:
- discovered servers;
- rooted servers;
- usable execution hosts;
- total RAM;
- used/reserved/free RAM;
- overall utilization.

### Purchased fleet
Aggregate identical purchased servers by RAM tier rather than printing one row per server, for example **8 × 64 TB**. Each tier may show utilization. Also show total purchased-server RAM, slots used/available, and meaningful tier range.

Individual hosts appear only when exceptional or when the operator explicitly expands a tier.

### Capacity / upgrade
Show:
- next meaningful purchase/upgrade/replacement;
- expected RAM gain;
- estimated cost;
- relevant budget/funding state;
- controller operational state such as Idle, Purchasing, Upgrading, Waiting for Funds, or Draining.

### Discovery / rooting
Show compact counts for unrooted, currently rootable, and newly eligible hosts, with exceptional/attention items available for expansion.

## Progression

Progression is explicitly player-facing.

It has three distinct policy modes:

- **OFF** — no progression analysis, recommendations, or automated progression actions.
- **MANUAL** — the progression decision engine continues analysing and presents the next suggested action, concise reason, requirements/cost/impact, and limited look-ahead, but performs no autonomous progression action.
- **AUTOMATED** — the same decision engine may execute eligible progression actions through normal authority/budget/command pathways; actions requiring the player remain recommendations.

Manual and Automated use the **same decision engine**. They differ only in whether eligible chosen actions may be automatically executed.

The primary presentation should emphasize:
- current mode;
- current/next action;
- short reason;
- requirements/cost/impact;
- current progress;
- a small number of likely upcoming objectives.

Progression eventually covers programs, factions/augmentations, player work, home upgrades, and reset planning. Exact visual structure may evolve with those controllers.

## Capability-specific tabs

Hacknet, Sleeves, Gang, Bladeburner, Corporation, and later BitNode-specific tabs follow the same production contract when implemented:

- at-a-glance state/resources;
- what the system is doing;
- current objective/target and progress;
- useful production/performance metrics;
- next meaningful action/milestone;
- concise human-readable reasoning;
- production-relevant attention items;
- standard lifecycle controls.

Their detailed layout is intentionally deferred until the corresponding system exists.

## Settings

Settings is the supported surface-level configuration center.

It may expose parameters and policy thresholds that influence controller decisions without exposing or rewriting the decision logic itself. Examples include:
- target eligibility thresholds such as minimum target money relative to maximum;
- acceptable security thresholds;
- stock position caps;
- capital reserve percentages;
- spending limits;
- concurrency limits;
- purchased-server policy limits;
- safe collection/display preferences where intentionally configurable.

Settings must not become an arbitrary editor for formulas, state-machine transitions, schema/correctness invariants, scheduler semantics, authority semantics, or every implementation constant.

Immediate operational intent stays on the relevant domain tab, for example:
- Hacking Money/XP mode;
- Progression OFF/MANUAL/AUTOMATED.

Settings are grouped by subsystem. Each setting should indicate whether it applies live or requires a domain restart, and unsafe/out-of-contract values are rejected rather than allowed to violate invariants.

## Presentation and window integration

Production uses the established compact dark grey-blue dashboard language and the same tab/button family as Validation.

It reuses the existing measured dashboard sizing/docking coordinator. No second window manager is introduced.

The expected normal desktop relationship is Validation as the narrow engineering surface with Production docked/anchored to its right. Production tab content may drive dashboard-owned dynamic size while the existing four-side docking/anchor relationship preserves placement. The exact visual layout and per-tab dimensions are intentionally left to the next tab-by-tab design pass.

## Implementation rule

This design does **not** authorize implementing future production controllers ahead of their roadmap milestones. Early Production Dashboard slices may consume only state/telemetry/configuration that already exists. Missing domain capability must be represented honestly rather than simulated by UI-owned logic.

Any future dashboard action must use the same command, authority, budget, scheduler, and lifecycle contracts as non-UI clients.