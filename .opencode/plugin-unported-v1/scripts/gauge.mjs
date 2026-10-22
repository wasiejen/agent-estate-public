// clone TODO #141 migration shim: the v1 plugin modules in THIS folder keep their
// relative import "./scripts/gauge.mjs" byte-unchanged; this re-export resolves that
// specifier to the clone's gauge-core home (.opencode/plugin/scripts/gauge.mjs) —
// ONE implementation, the SAME module instance for the watchdog/plugin imports
// and the direct probe/tool/smoke loads.

export * from "../../plugin/scripts/gauge.mjs";
