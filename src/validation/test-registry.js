export const TESTS = [
    {
        id:"m3.cadence.control", subsystem:"Collection Control", title:"Consumer cadence lease", risk:"SAFE",
        runner:"src/validation/tests/cadence-control-test.js",
        description:"Requests an intentionally over-fast short player cadence lease, verifies minimum-floor clamping and faster observations, then proves expiry restores baseline cadence.",
        validates:["Durable collection-control owner","Bounded consumer cadence leases","Automatic cadence lease expiry and baseline fallback"],
    },
    {
        id:"m3.canonical.state", subsystem:"Canonical State", title:"Canonical state contract", risk:"SAFE",
        runner:"src/validation/tests/canonical-state-test.js",
        description:"Checks canonical service health, five durable domains, observation timestamp preservation, positive revisions, and the absence of a universal freshness label.",
        validates:["Canonical service and five domains","Observation timestamp preservation","Canonical revision progression","Consumer-defined freshness contract"],
    },
    {
        id:"m3.canonical.restart", subsystem:"Canonical State", title:"Canonical restart reconciliation", risk:"DISRUPTIVE",
        runner:"src/validation/tests/canonical-restart-test.js",
        description:"Restarts only the canonical-state service and verifies it reconciles all five durable M2 observations without revision rollback.",
        validates:["Restart reconciliation"],
        confirmation:"Temporarily restarts the canonical-state service. Collectors remain running and durable observation snapshots are not modified.",
    },
    {
        id:"m2.dashboard.smoke",
        subsystem:"Dashboard",
        title:"Validation Dashboard smoke test",
        risk:"SAFE",
        runner:"src/validation/tests/dashboard-smoke-test.js",
        description:"Checks the installed dashboard, health, updater, and five M2 observation inputs without mutating runtime state.",
        validates:["Tabbed shell","Health parity","Data visibility"],
    },
    {
        id:"m2.updater.notification",
        subsystem:"Updater",
        title:"Updater notification observation",
        risk:"SAFE",
        runner:null,
        description:"Observe a genuine newer release while remaining on another tab. The Updater badge must appear without navigation being stolen.",
        validates:["Notification badges"],
        manual:true,
    },
    {
        id:"m2.dashboard.emergency-focus",
        subsystem:"Dashboard",
        title:"Emergency focus and recovery",
        risk:"DISRUPTIVE",
        runner:"src/validation/tests/emergency-focus-test.js",
        description:"Temporarily stops four observation collectors to cross the real emergency threshold, verifies one-shot Health focus and acknowledgement, then restores every stopped process.",
        validates:["Critical focus escalation","Failure isolation","Recovery"],
        confirmation:"Temporarily stops player, network, market, and infrastructure collectors. Automatic restoration is armed before disruption.",
    },
];

export function findTest(id){return TESTS.find((test)=>test?.id===id)??null;}
