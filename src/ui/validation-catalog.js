export const VALIDATION_GROUPS = [
    { id:"m1-deployment", milestone:"M1", title:"Reliable Deployment", lifecycle:"validated", revision:20,
      checks:["Pinned release content","Exact-revision approval","Concurrent deployment guard","Persistent-unit retirement","Operator-visible completion"] },
    { id:"m2-health", milestone:"M2", title:"Health & Telemetry", lifecycle:"validated", revision:41,
      checks:["Cross-host health telemetry","Stale detection and recovery","Service-instance supersession","Producer-owned uptime","Incident expiry"] },
    { id:"m2-collectors", milestone:"M2", title:"Observation Collectors", lifecycle:"validating", revision:41,
      checks:["Player observation","Network observation","Market observation","Infrastructure observation","Capabilities observation","Failure isolation"] },
    { id:"m2-validation-ui", milestone:"M2", title:"Validation Dashboard", lifecycle:"validating", revision:42,
      checks:["Tabbed shell","Health parity","Updater parity","Data visibility","Notification badges","Critical focus escalation"] },
];

export function validationSummary() {
    const validated = VALIDATION_GROUPS.filter((g) => g.lifecycle === "validated");
    const validating = VALIDATION_GROUPS.filter((g) => g.lifecycle !== "validated");
    return {
        validatedGroups: validated.length, validatingGroups: validating.length,
        validatedChecks: validated.reduce((n,g)=>n+g.checks.length,0),
        validatingChecks: validating.reduce((n,g)=>n+g.checks.length,0),
    };
}
