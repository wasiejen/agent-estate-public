// clone TODO #141 migration shim: the v1 plugin modules in THIS folder keep their
// relative import "./scripts/gauge.mjs" byte-unchanged; this re-export resolves that
// specifier to the gauge core's v2 home
// (.opencode/plugins/scripts/gauge.mjs, TODO #150 unit A, 2026-10-26) —
// ONE implementation, the SAME module instance for the watchdog/plugin imports
// and the direct probe/tool/smoke loads.

export * from "../../plugins/scripts/gauge.mjs";
