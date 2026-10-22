// typecheck.ts — shape-checks the v2 plugin modules against the
// @opencode/plugin types (the fork's installed workspace): each default
// export must be a promise-surface plugin { id, setup }.
//
// Run:  home/Repos/opencode/node_modules/.bin/tsgo.exe -p tsconfig.json
// (tsgo is the fork's own checker; tsc also accepts this config.)
import type { Plugin } from "@opencode/plugin";
import interceptPlugin from "../intercept_observer.ts";
import contextFamilyPlugin from "../context_family.ts";

const check: Plugin.Plugin = interceptPlugin;
const check2: Plugin.Plugin = contextFamilyPlugin;
export default [check, check2];
