/**
 * Harmless persistent process used only to validate explicit runtime retirement.
 */

/** @param {NS} ns */
export async function main(ns) {
    if (ns.getHostname() !== "home") return;
    ns.disableLog("sleep");
    while (true) await ns.sleep(60_000);
}
