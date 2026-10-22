#!/usr/bin/env node
// port_sync.selftest.cjs -- selftest for port_sync.cjs (TODO #147).
// Runs the script against a THROWAWAY git repo pair under the scratchpad
// (never a real tree, never $TMP -- TODO #146: this host's Git-Bash $TMP=/tmp):
//   home/AppData/Local/Temp/opencode/port_sync_selftest/
// Covers: both resolution glob sets, opencode.jsonc never touched, the discovery
// guard moving a stray .opencode/plugin/x.ts into .opencode/plugin-unported-v1/ with a
// WARNING line, and the gate-FAIL path calling `git merge --abort`.
// Usage: node agent/scripts/git/port_sync.selftest.cjs   ->  `SELFTEST: ALL PASS` + exit 0.
"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const SCRATCH = "home/AppData/Local/Temp/opencode/port_sync_selftest";
const SRC = path.join(SCRATCH, "main_src");
const DST = path.join(SCRATCH, "clone_dst");
const SCRIPT = path.join(__dirname, "port_sync.cjs");

let pass = 0, fail = 0;
function ck(name, cond) { if (cond) pass++; else { fail++; console.log("FAIL: " + name); } }
const GITENV = Object.assign({}, process.env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t", GIT_COMMITTER_DATE: "Thu 1 Jan 2026 00:00:00 +0000", GIT_AUTHOR_DATE: "Thu 1 Jan 2026 00:00:00 +0000" });
function sh(bin, args, cwd) { return spawnSync(bin, args, { cwd, encoding: "utf8", env: GITENV }); }
function git(args, cwd) { const r = sh("git", args, cwd); if (r.status !== 0) { console.error("SETUP git " + args.join(" ") + " failed in " + cwd + "\n" + (r.stderr || "").slice(0, 400)); process.exit(2); } return r; }
function wf(root, rel, content) { const p = path.join(root, ...rel.split("/")); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
function rf(root, rel) { const p = path.join(root, ...rel.split("/")); return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; }
function commit(root, msg) { git(["add", "-A"], root); git(["commit", "-q", "-m", msg], root); }
function head(root) { return git(["rev-parse", "HEAD"], root).stdout.trim(); }
function dirty(root) { return git(["status", "--porcelain"], root).stdout.trim(); }

const PS = require("./port_sync.cjs");

// ---------- A. rule layer (pure) ----------
for (const p of [".opencode/tools/block_transfer.ts",
  ".opencode/plugin/tests/ok.smoke.mjs", "agent/handover/handover_task_to_planner.md",
  "loop/autorun-x/loop_log.md", "TODO.md", "agent/knowledge/x/y.md", "agent/memory/r/m.md",
  "agent/readme/repo_overview.md", "agent/scripts/git/port_sync.cjs",
  ".opencode/plugin/scripts/gauge.mjs"]) ck("take-main: " + p, PS.isTakeMain(p));
ck("probes take MAIN (Rule A: patch repoints its v1 refs)", PS.isTakeMain(".opencode/plugin/probes/handover_probe.mjs"));
ck("gauge core takes MAIN (unified core: MAIN adopts the clone's table-aware one)", PS.isTakeMain(".opencode/plugin/scripts/gauge.mjs"));
for (const p of ["TODO.md.bak", "agent/handovers/x.md", ".opencode/plugin/x.ts", ".opencode/plugins/tests/a.smoke.mjs", "maintainer/priority.md"]) ck("not-take-main: " + p, !PS.isTakeMain(p));
ck("classify config", PS.classify("opencode.jsonc") === "config");
ck("classify probe = take-main (Rule A)", PS.classify(".opencode/plugin/probes/handover_probe.mjs") === "take-main");
ck("classify gauge core = take-main", PS.classify(".opencode/plugin/scripts/gauge.mjs") === "take-main");
ck("patch repoints v1 plugin refs (incl. subdir rel)", (() => {
  const s = 'const A = path.join(R, ".opencode", "plugin", "ctx_watchdog.ts");\nconst B = path.join(R, ".opencode", "plugin", "deactivated", "compact_memory_v1.ts");\n';
  const p = PS.patchProbeImports(s);
  return p.sites.length === 2 && p.sites.includes("ctx_watchdog.ts") && p.sites.includes("deactivated/compact_memory_v1.ts") &&
    p.text.includes('".opencode", "plugin-unported-v1", "ctx_watchdog.ts"') &&
    p.text.includes('".opencode", "plugin-unported-v1", "deactivated", "compact_memory_v1.ts"');
})());
ck("patch leaves keep-dirs and non-plugin roots alone", (() => {
  const s = 'path.join(R, ".opencode", "plugin", "tests", "helper.ts"); path.join(R, ".opencode", "plugins", "x.ts"); path.join(R, ".opencode", "plugin", "probes", "handover_probe.mjs");';
  const p = PS.patchProbeImports(s);
  return p.sites.length === 0 && p.text === s;
})());
ck("patch is idempotent", (() => {
  const s = 'path.join(R, ".opencode", "plugin-unported-v1", "ctx_watchdog.ts");';
  const p = PS.patchProbeImports(s + "\n" + 'path.join(R, ".opencode", "plugin", "ctx_watchdog.ts");');
  const once = p.text;
  return p.sites.length === 1 && PS.patchProbeImports(once).sites.length === 0;
})());
ck("classify take-main", PS.classify("agent/handover/handover_task_to_planner.md") === "take-main");
ck("classify normal", PS.classify("README.md") === "normal");
ck("normPath windows", PS.isTakeMain(PS.normPath(".opencode\\tools\\x.ts")) && PS.normPath("a\\b.md") === "a/b.md");
for (const [p, want] of [[".opencode/plugin/x.ts", true], [".opencode/plugin/probes/z.ts", true],
  [".opencode/plugins/x.ts", false], [".opencode/plugin-unported-v1/x.ts", false], [".opencode/plugin/x.mjs", false]]) ck("guard " + p, PS.isGuardMove(p) === want);
ck("guardTarget nested", PS.guardTarget(".opencode/plugin/sub/y.ts") === ".opencode/plugin-unported-v1/sub/y.ts");
ck("parseMergeTree names", JSON.stringify(PS.parseMergeTree("c973825 tree\n.opencode/tools/block_transfer.ts\nopencode.jsonc\n\nAuto-merging x\nCONFLICT y\n")) === JSON.stringify([".opencode/tools/block_transfer.ts", "opencode.jsonc"]));
ck("parseMergeTree clean", PS.parseMergeTree("abc123 tree\n").length === 0);
ck("mergeTreeOid first line", PS.mergeTreeOid("c973825abc\n.opencode/x.ts\n\nAuto-merging\n") === "c973825abc");
ck("parseArgs default dry-run", (() => { const o = PS.parseArgs([]); return o && o.apply === false && o.gate === true && !!o.main && !!o.clone; })());
ck("parseArgs flags", (() => { const o = PS.parseArgs(["--apply", "--no-gate", "--main", "x"]); return o && o.apply === true && o.gate === false && o.main === "x"; })());
ck("parseArgs rejects unknown", PS.parseArgs(["--bogus"]) === null);
ck("planLines shapes", (() => {
  const s = PS.planLines([".opencode/tools/a.ts", "opencode.jsonc", "README.md"]).join("\n");
  return s.includes("take MAIN (--theirs)") && s.includes("keep branch-local (host-owned config)") && s.includes("merge normally");
})());

// ---------- scratch pair build ----------
function buildPair() {
  fs.rmSync(SCRATCH, { recursive: true, force: true, maxRetries: 8 });
  fs.mkdirSync(SCRATCH, { recursive: true });
  git(["init", "-q", "-b", "main", SRC], SCRATCH);
  wf(SRC, ".opencode/tools/block_transfer.ts", "base tool\n");
  wf(SRC, "agent/handover/handover_task_to_planner.md", "base handover\n");
  wf(SRC, "opencode.jsonc", '{"host":"base"}\n');
  wf(SRC, "README.md", "line1\nline2\nline3\n");
  wf(SRC, ".opencode/plugin/probes/handover_probe.mjs", 'console.log("PROBE handover: 1/1 PASS");\n');
  wf(SRC, ".opencode/plugin/base_both.ts", "base plugin file in BOTH trees\n");
  wf(SRC, ".opencode/plugin/tests/ok.smoke.mjs", 'console.log("SMOKE: ALL PASS");\n');
  wf(SRC, ".opencode/plugin/scripts/gauge.mjs", "base gauge core\n");
  commit(SRC, "base");
  git(["clone", "-q", "-b", "main", SRC, DST], SCRATCH);   // clone BEFORE the MAIN-side commit -> real divergence
  git(["branch", "-m", "main", "migration"], DST);
  wf(DST, ".opencode/tools/block_transfer.ts", "clone tool v2\n");
  wf(DST, "agent/handover/handover_task_to_planner.md", "clone handover\n");
  wf(DST, "opencode.jsonc", '{"host":"clone","v2":true}\n');
  wf(DST, "README.md", "line1\nline2\nline3 clone\n");
  wf(DST, ".opencode/plugins/tests/a.smoke.mjs", 'console.log("SMOKE: ALL PASS");\n');
  wf(DST, ".opencode/plugin-unported-v1/keepme.ts", "unported\n");
  wf(DST, ".opencode/plugin/probes/handover_probe.mjs", 'console.log("PROBE handover: 1/1 PASS"); // clone-side tweak\n');
  wf(DST, ".opencode/plugin/scripts/gauge.mjs", "clone gauge core (table-aware)\n");
  commit(DST, "clone side");
  wf(SRC, ".opencode/tools/block_transfer.ts", "main tool new\n");
  wf(SRC, "agent/handover/handover_task_to_planner.md", "main handover\n");
  wf(SRC, "opencode.jsonc", '{"host":"main","v1":true}\n');
  wf(SRC, "README.md", "line1 main\nline2\nline3\n");
  wf(SRC, ".opencode/plugin/x.ts", "export const stray = 1;\n");
  wf(SRC, ".opencode/plugin/probes/handover_probe.mjs", 'const P = [".opencode", "plugin", "ctx_watchdog.ts"];\nconsole.log("FAIL [s99] surfacing pin");\nconsole.log("PROBE handover: 2/2 PASS");\n');
  wf(SRC, ".opencode/plugin/tests/fail.smoke.mjs", "process.exit(1);\n");
  wf(SRC, ".opencode/plugin/scripts/gauge.mjs", "main gauge core (unified)\n");
  commit(SRC, "main side");
  return { cfg: '{"host":"clone","v2":true}\n', cloneTip: head(DST), mainTip: head(SRC) };
}
const PAIR = buildPair();
const CLONE_CFG = PAIR.cfg, CLONE_TIP = PAIR.cloneTip, MAIN_TIP = PAIR.mainTip;
function runScript(extra) { const r = sh("node", [SCRIPT, ...extra], SCRATCH); return { code: (r.status == null ? r.code : r.status), out: r.stdout + "\n" + r.stderr }; }
function dbg(tag, r) { if (process.env.PS_DEBUG) console.log("=== " + tag + " exit=" + r.code + " ===\n" + r.out.split("\n").slice(0, 60).join("\n")); }
const DRY = ["--main", SRC, "--clone", DST];

// ---------- B. dry run: zero mutation ----------
let r = runScript(DRY); dbg("B dry", r);
ck("dry exit 0", r.code === 0);
for (const p of [".opencode/tools/block_transfer.ts", "agent/handover/handover_task_to_planner.md", "opencode.jsonc", ".opencode/plugin/scripts/gauge.mjs"]) ck("dry conflict line: " + p, r.out.includes("conflict: " + p));
ck("dry README auto-merges (not in conflict set)", !r.out.includes("conflict: README.md"));
ck("dry plan take-main", r.out.includes("plan: .opencode/tools/block_transfer.ts -> take MAIN (--theirs)"));
ck("dry plan gauge core take-main", r.out.includes("plan: .opencode/plugin/scripts/gauge.mjs -> take MAIN (--theirs)"));
ck("dry plan config line", r.out.includes("keep branch-local (host-owned config)"));
ck("dry prints the probe patch preview", r.out.includes("would: patch probe imports: 1 site(s) -> .opencode/plugin-unported-v1/ [ctx_watchdog.ts]"));
ck("dry prints probe take-main plan", r.out.includes("plan: .opencode/plugin/probes/handover_probe.mjs -> take MAIN (--theirs)"));
ck("dry guard plan line", r.out.includes("plan: .opencode/plugin/x.ts -> discovery guard: move -> " + PS.guardTarget(".opencode/plugin/x.ts")));
ck("dry guard skips plugin .ts already in the clone", !r.out.includes("plan: .opencode/plugin/base_both.ts"));
ck("dry prints commands", r.out.includes("would: git -C " + DST + " merge --no-commit FETCH_HEAD") && r.out.includes("--theirs"));
ck("dry zero-mutation PROVEN", r.out.includes("zero-mutation: PROVEN"));
ck("dry scratch clone untouched", dirty(DST) === "" && head(DST) === CLONE_TIP);
ck("dry scratch main untouched", dirty(SRC) === "" && head(SRC) === MAIN_TIP);
ck("dry no merge staged", !fs.existsSync(path.join(DST, ".git", "MERGE_HEAD")));

// ---------- C. --apply --no-gate: resolutions + guard, staged not committed ----------
r = runScript([...DRY, "--apply", "--no-gate"]);
ck("apply exit 0", r.code === 0);
ck("apply gate skipped", r.out.includes("gate: skipped (--no-gate)"));
ck("apply staged not committed", r.out.includes("merge staged, not committed"));
ck("apply config line", r.out.includes("config: kept branch-local (host-owned)"));
ck("apply no commit made", head(DST) === CLONE_TIP && fs.existsSync(path.join(DST, ".git", "MERGE_HEAD")));
ck("apply took MAIN for tools file", rf(DST, ".opencode/tools/block_transfer.ts") === "main tool new\n");
ck("apply landed the MAIN gauge-core bytes in the clone copy", rf(DST, ".opencode/plugin/scripts/gauge.mjs") === "main gauge core (unified)\n");
ck("apply took MAIN for handover file", rf(DST, "agent/handover/handover_task_to_planner.md") === "main handover\n");
ck("apply opencode.jsonc byte-identical (never touched)", rf(DST, "opencode.jsonc") === CLONE_CFG);
ck("apply opencode.jsonc has no conflict markers", !String(rf(DST, "opencode.jsonc")).includes("<<<<<<<"));
ck("apply MAIN-side opencode.jsonc never landed", !String(rf(DST, "opencode.jsonc")).includes("v1"));
ck("apply guard moved stray plugin file away", rf(DST, ".opencode/plugin/x.ts") === null);
ck("apply guard moved into unported dir (content follows)", rf(DST, ".opencode/plugin-unported-v1/x.ts") === "export const stray = 1;\n");
ck("apply guard WARNING line", r.out.includes("discovery guard: moved .opencode/plugin/x.ts -> .opencode/plugin-unported-v1/x.ts"));
ck("apply v2 estate untouched", rf(DST, ".opencode/plugins/tests/a.smoke.mjs") === 'console.log("SMOKE: ALL PASS");\n' && rf(DST, ".opencode/plugin-unported-v1/keepme.ts") === "unported\n");
ck("apply leaves pre-existing plugin .ts alone", rf(DST, ".opencode/plugin/base_both.ts") === "base plugin file in BOTH trees\n" && rf(DST, ".opencode/plugin-unported-v1/base_both.ts") === null);
ck("apply README auto-merged both sides", (() => { const s = rf(DST, "README.md"); return s.includes("line1 main") && s.includes("line3 clone"); })());
ck("apply staged state present", dirty(DST) !== "" && dirty(DST).includes(".opencode/tools/block_transfer.ts"));
ck("apply main tree untouched", dirty(SRC) === "" && head(SRC) === MAIN_TIP);
ck("apply main-tree guard line", r.out.includes("main-tree: unchanged (fetch-source only)"));
ck("apply patch line printed", r.out.includes("patch: probe imports repointed") || r.out.includes("patch: probe imports: already branch-repointed"));
ck("apply patched probe in the tree", (() => { const s = rf(DST, ".opencode/plugin/probes/handover_probe.mjs"); return s !== null && s.includes('".opencode", "plugin-unported-v1", "ctx_watchdog.ts"') && !s.includes('".opencode", "plugin", "ctx_watchdog.ts"'); })());
git(["merge", "--abort"], DST); // clear the staged merge before the FAIL scenario
ck("C cleanup abort restored the clone (clean + HEAD back)", dirty(DST) === "" && head(DST) === CLONE_TIP && rf(DST, ".opencode/tools/block_transfer.ts") === "clone tool v2\n");

// ---------- D. gate FAIL path -> git merge --abort restores everything ----------
r = runScript(DRY.concat(["--apply"])); dbg("D apply", r);
ck("fail exit 1", r.code === 1);
ck("gate FAIL printed", r.out.includes("gate: FAIL"));
ck("gate probe PASS", r.out.includes("gate probe: PASS"));
ck("gate surfaces probe FAIL lines", r.out.includes("failing checks: FAIL [s99] surfacing pin"));
ck("gate v1 ok smoke PASS", r.out.includes("gate v1 ok.smoke.mjs: PASS"));
ck("gate v1 fail smoke FAIL", r.out.includes("gate v1 fail.smoke.mjs: FAIL"));
ck("gate v2 bun smoke PASS", r.out.includes("gate v2 a.smoke.mjs: PASS"));
ck("gate typecheck SKIP (no tsconfig in scratch)", r.out.includes("gate typecheck: SKIP"));
ck("abort command echoed", r.out.includes("cmd: git -C " + DST + " merge --abort"));
ck("abort state line", r.out.includes("state: merge aborted, nothing applied"));
ck("abort: scratch clone status clean", dirty(DST) === "");
ck("abort: HEAD unchanged", head(DST) === CLONE_TIP);
ck("abort: tools file back to clone side", rf(DST, ".opencode/tools/block_transfer.ts") === "clone tool v2\n");
ck("abort: gauge core back to the clone bytes", rf(DST, ".opencode/plugin/scripts/gauge.mjs") === "clone gauge core (table-aware)\n");
ck("abort: handover file back to clone side", rf(DST, "agent/handover/handover_task_to_planner.md") === "clone handover\n");
ck("abort: opencode.jsonc == clone original", rf(DST, "opencode.jsonc") === CLONE_CFG);
ck("abort: stray plugin file gone", rf(DST, ".opencode/plugin/x.ts") === null && rf(DST, ".opencode/plugin-unported-v1/x.ts") === null);
ck("abort: v2 estate intact", rf(DST, ".opencode/plugins/tests/a.smoke.mjs") !== null && rf(DST, ".opencode/plugin-unported-v1/keepme.ts") === "unported\n");
ck("abort: pre-existing plugin .ts intact", rf(DST, ".opencode/plugin/base_both.ts") === "base plugin file in BOTH trees\n");
ck("abort: main tree untouched", dirty(SRC) === "" && head(SRC) === MAIN_TIP);

// ---------- E. unresolved conflict (theirs DELETED a take-main path) -> assert + abort ----------
const P2 = buildPair();
wf(DST, "README.md", "line1 clone-conflict\nline2\nline3 clone\n");
commit(DST, "clone rewrites README line1");
const T2 = head(DST);
r = runScript(DRY.concat(["--apply"])); dbg("E apply", r);
ck("E exit 1", r.code === 1);
ck("E manual-conflict line", r.out.includes("manual: README.md left unmerged for a human 3-way"));
ck("E unmerged-left line", r.out.includes("unmerged-left: README.md"));
ck("E abort state line", r.out.includes("state: merge aborted, nothing applied (conflict markers would survive the gate)"));
ck("E gate never ran on a half-marked tree", !r.out.includes("gate probe:"));
ck("E clone restored (clean + HEAD back + README back)", dirty(DST) === "" && head(DST) === T2 && rf(DST, "README.md") === "line1 clone-conflict\nline2\nline3 clone\n");

console.log("checks: " + (pass + fail) + " pass=" + pass + " fail=" + fail);
if (fail === 0) console.log("SELFTEST: ALL PASS");
else console.log("SELFTEST: " + fail + " FAIL of " + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
