export const TESTS = [
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
];

export function findTest(id){return TESTS.find((test)=>test.id===id)??null;}
