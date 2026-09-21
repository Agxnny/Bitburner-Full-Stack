import { getDashboardAnchor, setDashboardAnchor } from "./dashboard-layout-coordinator.js";

export function DashboardAnchorControl({ group, id, bridge, accent = "#2993ff", muted = "#91a9c7" }) {
    const [anchorId, setAnchorId] = React.useState(() => bridge?.layout?.anchorId ?? getDashboardAnchor(group, []));
    React.useEffect(() => {
        const timer = setInterval(() => setAnchorId(bridge?.layout?.anchorId ?? getDashboardAnchor(group, [])), 250);
        return () => clearInterval(timer);
    }, [group, bridge]);

    const active = anchorId === id;
    const choose = () => {
        setDashboardAnchor(group, id);
        setAnchorId(id);
    };

    return <button
        onClick={choose}
        title={active ? "This dashboard anchors the layout group" : "Make this dashboard the layout anchor"}
        style={{
            marginLeft: "auto",
            height: 24,
            padding: "0 8px",
            borderRadius: 5,
            border: `1px solid ${active ? accent : "#294766"}`,
            background: active ? "rgba(41,147,255,0.14)" : "#111a26",
            color: active ? accent : muted,
            fontSize: 10,
            fontWeight: 750,
            letterSpacing: ".05em",
            cursor: "pointer",
        }}
    >
        {active ? "◆ ANCHOR" : "◇ ANCHOR"}
    </button>;
}
