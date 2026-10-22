#!/usr/bin/env node
// port_sync.cjs -- sync MAIN's `main` branch into the v2 clone's `migration` branch by MERGE.
// DEFAULT = DRY RUN: fetch into the clone, print the merge-tree conflict set, the per-path
// resolution plan, and the exact commands; mutate NOTHING (status+HEAD proof printed for BOTH
// trees, diffed to empty). --apply = fetch -> `git merge --no-commit FETCH_HEAD` -> resolutions
// -> discovery guard -> clone gate -> on any FAIL: `gate: FAIL` + `git merge --abort`;
// on green: `gate: PASS` + `merge staged, not committed` (it NEVER commits the merge; the
// first real apply is the maintainer's act, TODO #147).
// Boundary (maintainer ruling 2026-10-22, #147): take MAIN (`--theirs`) for the TAKE_MAIN
// set; `opencode.jsonc` is host-owned and NEVER written -- on conflict it is resolved to the
// clone's OWN side (`checkout --ours`), content stays byte-identical, MAIN's side never lands;
// everything else merges normally (git's own 3-way).
// Discovery guard (v2 plugin roots are ["plugin","plugins"], fork source-directory.ts:7):
// any `.ts` NEWLY present under `.opencode/plugin/` after the merge is moved to
// `.opencode/plugin-unported-v1/` (structure preserved) with a WARNING line -- a merge must
// not re-add v1 plugins into the v2 discovery path.
// Usage: node port_sync.cjs [--dry-run|--apply] [--main <path>] [--clone <path>] [--no-gate]
//   env PORT_SYNC_MAIN / PORT_SYNC_CLONE / TSGO_EXE override the inline host defaults.
// Reads: no write outside the clone tree; MAIN's tree is fetch-source only. Plain node, no deps.
"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const P_MAIN = process.env.PORT_SYNC_MAIN || "repo-root";
const P_CLONE = process.env.PORT_SYNC_CLONE || "repo-root-v2";
const MAIN_BRANCH = "main", CLONE_BRANCH = "migration";
const TSGO = process.env.TSGO_EXE || "home/Repos/opencode/node_modules/.bin/tsgo.exe";

const TAKE_MAIN = [
  ".opencode/tools/", ".opencode/plugin/probes/", ".opencode/plugin/tests/",
  "agent/handover/", "loop/", "TODO.md",
  "agent/knowledge/", "agent/memory/", "agent/readme/", "agent/scripts/",
];
const CONFIG_PATH = "opencode.jsonc";
const PLUGIN_DIR = ".opencode/plugin/", UNPORTED_DIR = ".opencode/plugin-unported-v1/";

// ---- pure rule layer (exported for the selftest) ----
function normPath(p) { return String(p).split("\\").join("/"); }
function isTakeMain(p) { return TAKE_MAIN.some((pre) => (pre.endsWith("/") ? p.startsWith(pre) : p === pre)); }
function classify(p) { return p === CONFIG_PATH ? "config" : isTakeMain(p) ? "take-main" : "normal"; }
function isGuardMove(p) { return p.startsWith(PLUGIN_DIR) && p.endsWith(".ts"); }
function guardTarget(p) { return UNPORTED_DIR + p.slice(PLUGIN_DIR.length); }
function parseMergeTree(out) {
  const lines = String(out).split("\n");
  const names = [];
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") break;                 // names block ends at the first blank line
    names.push(l.trim());                      // line 0 = written tree OID
  }
  return names;
}
function parseArgs(argv) {
  const o = { apply: false, main: P_MAIN, clone: P_CLONE, gate: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") o.apply = false;
    else if (a === "--apply") o.apply = true;
    else if (a === "--main") o.main = argv[++i];
    else if (a === "--clone") o.clone = argv[++i];
    else if (a === "--no-gate") o.gate = false;
    else { console.error("unknown arg: " + a); return null; }
  }
  return o;
}

// ---- process layer ----
function fmt(bin, args) { return [bin, ...args].map((a) => (/\s/.test(a) ? '"' + a + '"' : a)).join(" "); }
function run(bin, args, cwd) { return spawnSync(bin, args, { cwd, encoding: "utf8" }); }
function gitAt(dir, args) { return run("git", ["-C", dir, ...args], undefined); }
function execPrint(bin, args, cwd) {
  console.log("cmd: " + fmt(bin, args));
  const r = run(bin, args, cwd);
  if (r.status !== 0 && r.stderr) console.log("  stderr: " + (r.stderr.trim().split("\n")[0] || "").slice(0, 200));
  return r;
}
function tailLine(s) {
  const ls = String(s == null ? "" : s).trim().split("\n").filter((l) => l.trim());
  return ls.length ? ls[ls.length - 1].slice(0, 160) : "(no output)";
}
// bun on this host is PATH-shimmed (npm bun / bun.cmd -- node spawnSync cannot exec those),
// so the real exe path is the default and env BUN_EXE overrides it (script convention #125).
const BUN_HOST = process.env.BUN_EXE || "home/AppData/Roaming/npm/node_modules/bun/bin/bun.exe";
function resolveBun() {
  if (fs.existsSync(BUN_HOST) && run(BUN_HOST, ["--version"]).status === 0) return BUN_HOST;
  for (const c of ["bun", "bun.exe"]) if (run(c, ["--version"]).status === 0) return c;
  return null;
}
function snapshot(dir) {
  const st = gitAt(dir, ["status", "--porcelain"]);
  const hd = gitAt(dir, ["rev-parse", "HEAD"]);
  return { status: st.stdout.trim(), head: (hd.stdout || "").trim() };
}
function printProof(pre, post, label) {
  for (const t of ["main", "clone"]) {
    console.log("proof[" + t + "] HEAD before=" + pre[t].head + " after=" + post[t].head);
    console.log("proof[" + t + "] status before=[" + pre[t].status + "] after=[" + post[t].status + "]");
  }
  const ok = pre.main.head === post.main.head && pre.main.status === post.main.status &&
             pre.clone.head === post.clone.head && pre.clone.status === post.clone.status;
  console.log("zero-mutation: " + (ok ? "PROVEN" : "FAILED") + " (both trees: HEAD + status --porcelain identical)");
  return ok;
}

function planLines(conflicts) {
  const out = [];
  for (const p of conflicts) {
    const k = classify(p);
    if (k === "config") out.push("plan: " + p + " -> config: kept branch-local (host-owned)");
    else if (k === "take-main") out.push("plan: " + p + " -> take MAIN (--theirs)");
    else out.push("plan: " + p + " -> merge normally");
  }
  return out;
}

// newly-present .ts under .opencode/plugin/ : the MERGE-TREE result tree minus the clone branch tree
function mergeTreeOid(out) { return String(out).split("\n")[0].trim(); }
function guardCandidates(treeOid, cloneDir) {
  const merged = gitAt(cloneDir, ["ls-tree", "-r", "--name-only", treeOid]).stdout.split("\n");
  const pre = new Set(gitAt(cloneDir, ["ls-tree", "-r", "--name-only", CLONE_BRANCH]).stdout.split("\n"));
  return merged.filter((p) => isGuardMove(p) && !pre.has(p));
}

function runGate(cloneDir) {
  let fail = 0;
  const step = (name, ok, note) => {
    console.log("gate " + name + ": " + (ok === null ? "SKIP" : ok ? "PASS" : "FAIL") + (note ? " | " + note : ""));
    if (ok === false) fail++;
  };
  const probe = path.join(cloneDir, ".opencode/plugin/probes/handover_probe.mjs");
  if (fs.existsSync(probe)) {
    const r = run("node", [".opencode/plugin/probes/handover_probe.mjs"], cloneDir);
    step("probe", r.status === 0 && /PROBE handover: (\d+)\/\1 PASS/.test(r.stdout || ""), tailLine(r.stdout));
  } else step("probe", null, "missing");
  const bunExe = resolveBun();
  for (const [dirLabel, tag, args, needMarker] of [
    [".opencode/plugin/tests", "v1", (f) => ["node", [".opencode/plugin/tests/" + f], cloneDir], false],
    [".opencode/plugins/tests", "v2", (f) => ["bun", ["run", f], path.join(cloneDir, ".opencode/plugins/tests")], true],
  ]) {
    const dir = path.join(cloneDir, dirLabel);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".smoke.mjs")).sort();
    for (const f of files) {
      const [bin0, a, cwd] = args(f);
      const bin = tag === "v2" ? bunExe : bin0;
      if (!bin) { step(tag + " " + f, null, "bun missing"); continue; }
      const r = run(bin, a, cwd);
      step(tag + " " + f, r.status === 0 && (!needMarker || /SMOKE: ALL PASS/.test(r.stdout || "")), tailLine(r.stdout));
    }
  }
  const tsconfig = path.join(cloneDir, ".opencode/plugins/tests/tsconfig.json");
  if (fs.existsSync(tsconfig) && fs.existsSync(TSGO)) {
    const r = run(TSGO, ["-p", ".opencode/plugins/tests/tsconfig.json"], cloneDir);
    step("typecheck", r.status === 0 && (r.stdout || "").trim() === "", tailLine(r.stdout + r.stderr));
  } else step("typecheck", null, "tsconfig or tsgo missing");
  return fail;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o) { console.error("usage: node port_sync.cjs [--dry-run|--apply] [--main <path>] [--clone <path>] [--no-gate]"); process.exit(2); }
  for (const [d, br] of [[o.main, MAIN_BRANCH], [o.clone, CLONE_BRANCH]]) {
    if (!fs.existsSync(d)) { console.error("tree missing: " + d); process.exit(2); }
    const r = gitAt(d, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (r.status !== 0) { console.error("not a git tree: " + d); process.exit(2); }
    const cur = (r.stdout || "").trim();
    if (cur !== br) { console.error("branch guard: " + d + " is on '" + cur + "', expected '" + br + "'"); process.exit(2); }
  }
  if (o.apply && gitAt(o.clone, ["status", "--porcelain"]).stdout.trim() !== "") {
    console.error("clone tree dirty: refusing to merge into it (finish/stash the WIP first)");
    process.exit(2);
  }
  const pre = { main: snapshot(o.main), clone: snapshot(o.clone) };

  execPrint("git", ["-C", o.clone, "fetch", "-q", o.main, MAIN_BRANCH]);
  const mt = execPrint("git", ["-C", o.clone, "merge-tree", "--write-tree", "--name-only", CLONE_BRANCH, "FETCH_HEAD"]);
  if (mt.status >= 2) { console.error("merge-tree: ERROR (exit " + mt.status + ")"); process.exit(2); }
  const conflicts = parseMergeTree(mt.stdout);
  console.log("merge-tree: " + conflicts.length + " conflict(s), clean-auto-merge of the rest");
  for (const p of conflicts) console.log("conflict: " + p);
  console.log("--- resolution plan (" + (o.apply ? "apply" : "dry run") + ") ---");
  for (const l of planLines(conflicts)) console.log(l);
  const guard = guardCandidates(mergeTreeOid(mt.stdout), o.clone);
  for (const p of guard) console.log("plan: " + p + " -> discovery guard: move -> " + guardTarget(p));

  if (!o.apply) {
    console.log("--- exact commands --apply would run ---");
    console.log("would: " + fmt("git", ["-C", o.clone, "merge", "--no-commit", "FETCH_HEAD"]));
    for (const p of conflicts) {
      if (classify(p) === "take-main") {
        console.log("would: " + fmt("git", ["-C", o.clone, "checkout", "--theirs", "--", p]));
        console.log("would: " + fmt("git", ["-C", o.clone, "add", "--", p]));
      } else if (classify(p) === "config") {
        console.log("would: " + fmt("git", ["-C", o.clone, "checkout", "--ours", "--", p]));
        console.log("would: " + fmt("git", ["-C", o.clone, "add", "--", p]));
      }
    }
    for (const p of guard) console.log("would: mv " + path.join(o.clone, ...p.split("/")) + " -> " + path.join(o.clone, ...guardTarget(p).split("/")));
    console.log("would: gate probe + node smokes + bun smokes + tsgo typecheck (skipped by --no-gate)");
    return printProof(pre, { main: snapshot(o.main), clone: snapshot(o.clone) }, "dry-run") ? process.exit(0) : process.exit(1);
  }

  const mg = execPrint("git", ["-C", o.clone, "merge", "--no-commit", "FETCH_HEAD"]);
  if (mg.status >= 2) { console.error("merge: ERROR (exit " + mg.status + ")"); process.exit(2); }
  let unmergedNormal = 0;
  for (const p of conflicts) {
    const k = classify(p);
    if (k === "take-main") {
      execPrint("git", ["-C", o.clone, "checkout", "--theirs", "--", p]);
      execPrint("git", ["-C", o.clone, "add", "--", p]);
    } else if (k === "config") {
      execPrint("git", ["-C", o.clone, "checkout", "--ours", "--", p]);
      execPrint("git", ["-C", o.clone, "add", "--", p]);
      console.log("config: kept branch-local (host-owned)");
    } else { unmergedNormal++; console.log("manual: " + p + " left unmerged for a human 3-way"); }
  }
  const idx = new Set(gitAt(o.clone, ["ls-files"]).stdout.split("\n"));
  const preTree = new Set(gitAt(o.clone, ["ls-tree", "-r", "--name-only", "HEAD"]).stdout.split("\n"));
  for (const p of guardCandidates(mergeTreeOid(mt.stdout), o.clone)) {
    if (!idx.has(p) || preTree.has(p)) continue;
    const src = path.join(o.clone, ...p.split("/")), dst = path.join(o.clone, ...guardTarget(p).split("/"));
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.renameSync(src, dst);
    execPrint("git", ["-C", o.clone, "add", "--", p]);
    execPrint("git", ["-C", o.clone, "add", "--", guardTarget(p)]);
    console.log("discovery guard: moved " + p + " -> " + guardTarget(p) + " (v2 discovery root .opencode/plugin)");
  }
  const gfail = o.gate ? runGate(o.clone) : (console.log("gate: skipped (--no-gate)"), 0);
  if (gfail > 0) {
    console.log("gate: FAIL (" + gfail + " suite step(s))");
    execPrint("git", ["-C", o.clone, "merge", "--abort"]);
    console.log("state: merge aborted, nothing applied");
    process.exit(1);
  }
  if (unmergedNormal > 0) console.log("note: " + unmergedNormal + " normal-conflict file(s) left unmerged (staged state kept)");
  console.log("gate: PASS");
  console.log("merge staged, not committed");
  if (gitAt(o.main, ["status", "--porcelain"]).stdout.trim() !== "" || pre.main.head !== gitAt(o.main, ["rev-parse", "HEAD"]).stdout.trim()) {
    console.error("WARNING: MAIN tree changed during apply -- inspect");
  } else console.log("main-tree: unchanged (fetch-source only)");
}

if (require.main === module) main();
module.exports = { normPath, isTakeMain, classify, isGuardMove, guardTarget, parseMergeTree, mergeTreeOid, parseArgs, planLines, PLUGIN_DIR, UNPORTED_DIR, TAKE_MAIN, CONFIG_PATH };
