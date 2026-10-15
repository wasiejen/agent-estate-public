// typecheck.ts — shape-checks the v2 intercept plugin module against the
// @opencode/plugin types (the fork's installed workspace): the default
// export must be a promise-surface plugin { id, setup }.
//
// Run:  home/Repos/opencode/node_modules/.bin/tsgo.exe -p tsconfig.json
// (tsgo is the fork's own checker; tsc also accepts this config.)
import type { Plugin } from "@opencode/plugin";
import plugin from "../intercept_observer.ts";

const check: Plugin.Plugin = plugin;
export default check;
