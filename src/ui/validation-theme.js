export const V = {
    page:"#0b1119", surface:"#111a26", raised:"#152131", border:"#294766", divider:"#25384d",
    text:"#f3f6fb", muted:"#91a9c7", blue:"#2993ff", green:"#29d8a3", amber:"#ffb31a", red:"#ff5d68",
};
export const panel = { border:`1px solid ${V.border}`, borderRadius:8, background:V.surface };
export const sectionTitle = { color:"#b8d2f3", fontSize:11, fontWeight:800, letterSpacing:".08em" };
export function tone(status) {
    if (["healthy","pass","validated","online"].includes(String(status).toLowerCase())) return V.green;
    if (["failed","fail","emergency"].includes(String(status).toLowerCase())) return V.red;
    if (["degraded","blocked","attention","warning"].includes(String(status).toLowerCase())) return V.amber;
    return V.blue;
}
