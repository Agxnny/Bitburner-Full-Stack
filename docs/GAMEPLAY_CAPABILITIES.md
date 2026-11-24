# Gameplay capability catalogue

Status: Proposed. All entries have undecided automation scope, implementation location and companion dependency unless explicitly approved later. Columns describe candidate responsibilities, not commitments. API access and function-level requirements must be verified against 3.0.1.

| ID | Domain | In-game actions / observations | Candidate companion responsibilities |
|---|---|---|---|
| G01 | Network discovery | Scan, classify servers | Network mapping, pathfinding |
| G02 | Server access | Open ports, root, backdoor | Eligibility, prioritisation |
| G03 | Hacking | Prepare targets; hack, grow, weaken; basic and distributed HWGW; multi-target; stock influence; recovery | Profitability, batch sizing and scheduling analysis |
| G04 | Experience farming | Execute XP-generating operations | XP efficiency |
| G05 | RAM sharing | Execute share | Allocation |
| G06 | Cloud servers | Purchase, upgrade, rename, replace | Cost and capacity optimisation |
| G07 | Home computer | Upgrade RAM and cores | Cost-benefit analysis |
| G08 | Programs | Create/buy programs, TOR | Acquisition planning |
| G09 | Darknet | Discover, authenticate, traverse, collect caches, utilise resources, monitor and recover access | In-game challenge solving, dynamic network analysis |
| G10 | Education | University courses | Training efficiency |
| G11 | Physical training | Gym activities | Stat progression optimisation |
| G12 | Crime | Commit in-game crimes; money, XP, karma, kills | Success and reward analysis |
| G13 | Employment | Apply, work, promote | Career and reputation planning |
| G14 | Factions | Invitations, join, work, donate | Eligibility, favour and reputation planning |
| G15 | Augmentations | Discover, purchase, install | Prerequisites, ordering and cost optimisation |
| G16 | Grafting | Acquire and graft | Priority and cost analysis |
| G17 | Travel | Change cities | Travel requirements |
| G18 | Healthcare | Monitor health, hospitalise | Thresholds |
| G19 | Infiltration | Read location/reward information; manual minigames | Difficulty and reward analysis |
| G20 | Casinos | Manual minigames | Probability and strategy analysis |
| G21 | Hacknet Nodes | Purchase and upgrade levels, RAM, cores | ROI analysis |
| G22 | Hacknet Servers | Upgrade, cache, hashes, spending, available compute | Hash storage, spending and ROI optimisation |
| G23 | Stock market | Acquire access, observe, trade long/short where unlocked, liquidate | Forecasting, 4S analysis, portfolio risk, stock-linked hacking coordination |
| G24 | Corporations | Establish, expand divisions/cities/offices, hire, assign, manage warehouses/materials/products, research, marketing, upgrades, exports, investment, IPO/shares/dividends | Economic models, production, supply chains, pricing and cycle planning |
| G25 | Gangs | Establish, recruit, train, assign, buy equipment, ascend, territory warfare | Respect, wanted level, profitability and ascension optimisation |
| G26 | Bladeburner | Recruitment, training, contracts, operations, Black Operations, skills, cities, stamina and health | Success probabilities, population/chaos and rank progression, team planning where supported |
| G27 | Sleeves | Shock recovery, synchronisation, education, gym, crime, employment, factions, Bladeburner, travel, augmentations | Multi-sleeve activity optimisation |
| G28 | Stanek's Gift | Accept gift, place and charge fragments | Layout solving, stat specialisation |
| G29 | IPvGO | Select opponent and board, submit moves, monitor statistics, unlocked in-game cheats | Board analysis, legal moves, strategies |
| G30 | Coding contracts | Discover, inspect, submit | Algorithmic solving and testing |
| G31 | BitNode progression | Complete and transition | Progression planning |
| G32 | Source-Files | Earn and inspect progression | Unlock tracking and prioritisation |
| G33 | Reset management | Augmentation/soft resets and recovery | Backup and recovery planning |
| G34 | Achievements | Perform gameplay objectives | Achievement tracking where data available |
| G35 | Intelligence | Perform XP-generating actions | Progression analysis |

## Review rules
Expand each domain into individually classified tasks before approval. Distinguish manual actions, supported API actions and observations. No unsupported game-internal automation assumed. Identify access gates, RAM cost, resource conflicts, inputs, outputs and failure modes.
