// state_snapshot.smoke.mjs — TODO #137 unit 5b: the v2 state_snapshot plugin
// smoke. bun, MOCK ctx — no opencode process. Pins the DoD 2 contract of
// `.opencode/plugins/state_snapshot.ts`: the loader shape {id:'state_snapshot',
// setup} + the `tool.transform`/`editor.add` registration (NO-argument object
// input, string output, teardown disposes the registration, NO hooks), the
// seven-section digest byte-shape carried from v1 (the section ORDER incl. the
// `## loop` section AFTER `## todo` — spec #155 pins BOTH loop forms: the
// present `loop=<folder> ITER=<n> log=loop/<folder>/loop_log.md` line from a
// fixture `loop/autorun-X/counter.json` and the `no-looprun` empty form, plus
// the counter fail-closes), the fixture
// commit subject under `## git`, the todo header count + the LAST-15 `#<id> —
// <60-char-truncated>` forms, the maintainer inbox first-lines max-5 + `… (+k
// more)`, priority.md's first 10, the sorted proposals filenames, the READY-
// MADE marker sweep run via bash carrying the fixture `--now` line with the
// `/done/`-filtered line ABSENT + the LIVE-first ordering (the LIVE-class
// `/done/`-filtered line ABSENT + the LIVE-first ordering (the LIVE-class
// `WIKI.md` hit prints BEFORE the DOC-class `proposals/approved/notes.md` hit —
// pin (23)) + the doc-noise pass (the DOC-QUOTE fixture hits under the excluded
// `agent/prompts/`, `loop/`, `proposals/implemented/` paths ABSENT — pins
// (24)/(25)), the nap first-40 + `… (read … for the rest)`
// steer), the 150-line hard cap (the LAST section's content lines trim from the
// run leaves the fixture tree byte-identical), and the soft role gate (the
// EXACT one-line refusal for a non-planner agent; planner/EMPTY/absent agents
// get the digest).
//
// Fixtures (scratchpad fixture repo trees incl. a `git init` + a marker-line
// .md, and FX4's `loop/autorun-X/counter.json` for the loop section) live in
// home/AppData/Local/Temp/opencode/state-snapshot-
// smoke-v2 (recreated every run) — the LIVE repo, loop folder, and DB are
// NEVER touched. Run: bun run state_snapshot.smoke.mjs (this dir). Expected
// final line: `SMOKE: ALL PASS`.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/state-snapshot-smoke-v2";
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "state_snapshot.ts");

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

rmSync(SCRATCH, { recursive: true, force: true });
mkdirSync(SCRATCH, { recursive: true });

function w(root, rel, text) {
  const p = path.join(root, rel);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, text, "utf8");
}
function gitInitCommit(root, subject) {
  const g = (args) => execFileSync("git", ["-C", root, "-c", "user.name=fx", "-c", "user.email=fx@fx", ...args], { encoding: "utf8" });
  g(["init", "-q"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", subject]);
}
function treeOf(root) {
  // a recursive `<rel>:<size>` listing — the READ-ONLY pin's snapshot
  const out = [];
  const walk = (d, rel) => {
    for (const e of readdirSync(d)) {
      const p = path.join(d, e);
      const r = rel === "" ? e : `${rel}/${e}`;
      if (statSync(p).isDirectory()) walk(p, r);
      else out.push(`${r}:${statSync(p).size}`);
    }
  };
  if (existsSync(root)) walk(root, "");
  return out.sort().join("\n");
}
function digestOf(out) {
  return String(out).split("\n");
}
function sectionBody(lines, name) {
  const i = lines.indexOf(`## ${name}`);
  if (i === -1) return null;
  const body = [];
  for (let j = i + 1; j < lines.length && !lines[j].startsWith("## "); j++) body.push(lines[j]);
  return body;
}

// ------------------------------------------------------------------ plugin load + one registration

const TOOLS = [];
let DISPOSED = 0;
function makeCtx(directory) {
  return {
    location: { directory },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (t) => TOOLS.push(t), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => { DISPOSED++; } };
      },
      hook: async (name) => {
        chk(`UNEXPECTED tool.hook(${name})`, false);
        return { dispose: async () => {} };
      },
    },
  };
}

const plugin = (await import(pathToFileURL(PLUGIN).href)).default;
chk("S0 default export is the loader shape { id: 'state_snapshot', setup }",
  plugin && typeof plugin === "object" && plugin.id === "state_snapshot" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const ROOT1 = path.join(SCRATCH, "fx1");

// ------------------------------------------------------------------ FX1 fixture — the rich digest (fits under the cap)

{
  w(ROOT1, "agent/handover/handover_planner.md", Array.from({ length: 15 }, (_, i) => `nap line ${i + 1}`).join("\n") + "\n");
  w(ROOT1, "TODO.md", [
    "# TODO",
    "## #12. alpha entry title",
    "## 7. plain numbered entry",
    "## #99. " + "x".repeat(75),
    "## Notes",
    "not a header",
  ].join("\n") + "\n");
  w(ROOT1, "maintainer/inbox_planner/README.md", "index, excluded\n");
  w(ROOT1, "maintainer/inbox_planner/notes.txt", "not md, excluded\n");
  for (const n of ["a", "b", "c", "d", "e"]) w(ROOT1, `maintainer/inbox_planner/${n}.md`, `inbox ${n} first line\nsecond line hidden\n`);
  w(ROOT1, "maintainer/inbox_planner/f.md", "y".repeat(100) + "\n");
  w(ROOT1, "maintainer/priority.md", Array.from({ length: 12 }, (_, i) => `prio line ${i + 1}`).join("\n") + "\n");
  w(ROOT1, "proposals/z_second.md", "p\n");
  w(ROOT1, "proposals/a_first.md", "p\n");
  w(ROOT1, "proposals/notmd.txt", "p\n");
  w(ROOT1, "proposals/approved/inner.md", "--now inner subfolder ignored\n");
  w(ROOT1, "proposals/approved/notes.md", "first line\n--now live marker\n");
  // the LIVE-CLASS fixture hit — WIKI.md prints AFTER proposals/ in the raw sweep
  // path ARGUMENT order, so the ordering pin (23) below is discriminating.
  w(ROOT1, "WIKI.md", "# wiki\n--main wiki live class marker\n");
  w(ROOT1, "maintainer/done/old.md", "--wip filtered by /done/\n");
  // the DOC-QUOTE fixtures — marker lines inside paths the doc-noise filter
  // EXCLUDES: they must stay ABSENT from the markers section (pin (24)).
  w(ROOT1, "agent/prompts/quoted.md", "prompt doc\n--now quoted in an excluded path\n");
  w(ROOT1, "loop/hidden.md", "loop doc\n--now quoted in an excluded path\n");
  w(ROOT1, "proposals/implemented/quoted.md", "implemented doc\n--now quoted in an excluded path\n");
  gitInitCommit(ROOT1, "snapshot fixture commit A");
}

// per-fixture setup retargets the repo-root carrier (the loop_log smoke's
// pattern); ONE registration per fixture root, disposed at the end.
const cleanup1 = await plugin.setup(makeCtx(ROOT1));
const TOOL = TOOLS[0];
chk("S1 setup registers ONE tool (name 'state_snapshot'), teardown returned, NO hooks",
  TOOLS.length === 1 && TOOL.name === "state_snapshot" && typeof cleanup1 === "function",
  `tools=${TOOLS.length}`);
chk("S1 tool surface: NO-argument object input (no properties, no required), string output, promise execute, non-empty description",
  TOOL.input?.type === "object" && TOOL.input.additionalProperties === false && Object.keys(TOOL.input.properties).length === 0 && TOOL.input.required === undefined && TOOL.output?.type === "string" && typeof TOOL.execute === "function" && TOOL.description.length > 0,
  JSON.stringify([TOOL.input, TOOL.output]));

{
  const before = treeOf(ROOT1);
  const out = (await TOOL.execute({}, { agent: "planner_FlashNext" })).output;
  const after = treeOf(ROOT1);
  const l1 = digestOf(out);
  const idx = ["git", "nap", "todo", "loop", "maintainer", "proposals", "markers"].map((n) => l1.indexOf(`## ${n}`));
  chk("(1) the seven section headers appear IN ORDER (git<nap<todo<loop<maintainer<proposals<markers)",
    idx.every((x) => x >= 0) && idx.every((x, i) => i === 0 || x > idx[i - 1]), JSON.stringify(idx));
  chk("(2) `## git` carries the fixture commit subject",
    sectionBody(l1, "git")?.some((l) => l.includes("snapshot fixture commit A")), JSON.stringify(sectionBody(l1, "git")));
  const n15 = sectionBody(l1, "nap");
  chk("(3) nap: the fixture's 15 lines, NO steer (<=40)",
    n15?.length === 15 && n15[0] === "nap line 1" && n15[14] === "nap line 15", JSON.stringify(n15?.length));
  const todo = sectionBody(l1, "todo");
  chk("(4) todo: `3 open-entry headers` + the LAST-15 form `#12 — alpha entry title` and `#7 — plain numbered entry` (file order, `## Notes` NOT counted)",
    todo?.[0] === "3 open-entry headers" && todo?.[1] === "#12 — alpha entry title" && todo?.[2] === "#7 — plain numbered entry", JSON.stringify(todo));
  chk("(5) todo remainder truncated to 60 chars (no ellipsis)",
    todo?.[3] === `#99 — ${"x".repeat(60)}`, JSON.stringify(todo?.[3]));
  const mt = sectionBody(l1, "maintainer");
  chk("(6) maintainer: the 5 inbox first lines (sorted, README.md + .txt excluded) + `… (+1 more)`",
    mt?.[0] === "a.md: inbox a first line" && mt?.[4] === "e.md: inbox e first line" && mt?.[5] === "… (+1 more)", JSON.stringify(mt?.slice(0, 6)));
  chk("(7) maintainer: the 6th inbox file's 100-char first line NOT shown beyond the +1-more steer; priority.md's FIRST 10 lines follow (line 11 absent)",
    mt?.[6] === "prio line 1" && mt?.[15] === "prio line 10" && !mt.includes("prio line 11"), JSON.stringify(mt?.length));
  const pr = sectionBody(l1, "proposals");
  chk("(8) proposals: the root .md FILENAMES sorted (subfolder + .txt excluded)",
    pr?.join(",") === "a_first.md,z_second.md", JSON.stringify(pr));
  const mk = sectionBody(l1, "markers");
  chk("(9) markers: the READY-MADE sweep run via bash carries the fixture proposals/approved/notes.md `--now` line",
    mk?.some((l) => l.includes("proposals/approved/notes.md") && l.includes("--now live marker")), JSON.stringify(mk));
  chk("(10) markers: the /done/-filtered fixture line is ABSENT (the grep -v filter carried)",
    !mk?.some((l) => l.includes("/done/")), JSON.stringify(mk));
  // (23) — the LIVE-first markers ordering. The label is APPEND-only (the
  // existing (11)..(22) numbering stays untouched). The raw sweep path ARGUMENT
  // order prints the DOC-class proposals/approved/notes.md hit FIRST, so the pin FAILS
  // pre-change; the LIVE-CLASS WIKI.md hit prints first after the change.
  const mkHits = mk ?? [];
  const liveAt = mkHits.findIndex((l) => l.startsWith("WIKI.md:"));
  const docAt = mkHits.findIndex((l) => l.startsWith("proposals/approved/notes.md:"));
  chk("(23) markers ordering: the LIVE-class WIKI.md hit prints BEFORE the DOC-class proposals/approved/notes.md hit",
    liveAt >= 0 && docAt >= 0 && liveAt < docAt, JSON.stringify([liveAt, docAt]));
  chk("(11) READ-ONLY: the digest run leaves the fixture tree byte-identical",
    before === after, `before=${before.length} after=${after.length}`);
  chk("(12) FX1 digest is under the 150-line cap untouched (49 lines — the WIKI.md fixture added one sweep hit, the `## loop` section adds 2)",
    l1.length === 49, `len=${l1.length}`);
  const loopB = sectionBody(l1, "loop");
  chk("(26) loop: FX1 has NO autorun-* dir (only the loop/hidden.md FILE) → the EMPTY form `no-looprun`, positioned after `## todo` and before `## maintainer`",
    loopB?.length === 1 && loopB[0] === "no-looprun" &&
      l1.indexOf("## loop") > l1.indexOf("## todo") && l1.indexOf("## loop") < l1.indexOf("## maintainer"),
    JSON.stringify([loopB, l1.indexOf("## loop")]));
}

// (24) — the doc-noise pass: the DOC-QUOTE fixture hits (agent/prompts/quoted.md,
//       loop/hidden.md, proposals/implemented/quoted.md) ABSENT from the markers
//       section while the kept DOC hit + the LIVE hit stay PRESENT.
{
  const mk24 = sectionBody(digestOf((await TOOL.execute({}, { agent: "planner_FlashNext" })).output), "markers");
  chk("(24) markers: the excluded doc-quote paths ABSENT + the kept paths PRESENT",
    mk24?.every((l) =>
      !l.startsWith("agent/prompts/quoted.md:") &&
      !l.startsWith("loop/hidden.md:") &&
      !l.startsWith("proposals/implemented/quoted.md:")) &&
    mk24?.some((l) => l.startsWith("proposals/approved/notes.md:")) &&
    mk24?.some((l) => l.startsWith("WIKI.md:")), JSON.stringify(mk24));
}

// (25) — the path-anchored filter: a KEPT path whose TEXT quotes an excluded
//       tree INLINE (proposals/approved/ref.md) still prints.
{
  w(ROOT1, "proposals/approved/ref.md", "--now quote mentions agent/readme INLINE\n");
  const mk25 = sectionBody(digestOf((await TOOL.execute({}, { agent: "planner_FlashNext" })).output), "markers");
  chk("(25) markers: the inline-quote line SURVIVES (the grep -v patterns are path-anchored)",
    mk25?.some((l) => l.startsWith("proposals/approved/ref.md:")), JSON.stringify(mk25));
}

// ------------------------------------------------------------------ FX2 — the refusal gate + empties + fail-closed lines

const ROOT2 = path.join(SCRATCH, "fx2");
{
  w(ROOT2, "loop/quiet.md", "no markers here\n");
  w(ROOT2, "TODO.md", "no entry headers\n");
}
{
  const cleanup2 = await plugin.setup(makeCtx(ROOT2));
  const T2 = TOOLS[1];
  const refused = (await T2.execute({}, { agent: "worker_FlashNext" })).output;
  chk("(13) refusal: a non-planner agent gets the EXACT one-line refusal, NO digest",
    refused === "state_snapshot is the planner init digest — not for worker_FlashNext", refused);
  const out = (await T2.execute({}, { agent: "" })).output;
  const out2 = (await T2.execute({}, {})).output;
  chk("(14) EMPTY / absent agent passes the soft gate (the digest lands; both forms byte-equal)",
    out === out2 && digestOf(out)[0] === "## git", JSON.stringify([digestOf(out)[0], digestOf(out2)[0]]));
  const l2 = digestOf(out);
  const napB = sectionBody(l2, "nap");
  const mtB = sectionBody(l2, "maintainer");
  const prB = sectionBody(l2, "proposals");
  const mkB = sectionBody(l2, "markers");
  const todoB = sectionBody(l2, "todo");
  const gitB = sectionBody(l2, "git");
  chk("(15) FX2 fail-closed `## git` line (a scratchpad dir, not a git repo — never a throw)",
    gitB?.length === 1 && gitB[0].startsWith("(git log failed: "), JSON.stringify(gitB));
  chk("(16) FX2 fail-closed nap line `(nap missing: agent/handover/handover_planner.md)`",
    napB?.[0] === "(nap missing: agent/handover/handover_planner.md)", JSON.stringify(napB));
  chk("(17) FX2 todo: `0 open-entry headers` (count line only)",
    todoB?.length === 1 && todoB[0] === "0 open-entry headers", JSON.stringify(todoB));
  chk("(18) FX2 empties: inbox `(none)` + priority.md fail-closed line",
    mtB?.[0] === "(none)" && mtB?.[1] === "(priority.md missing)", JSON.stringify(mtB));
  chk("(19) FX2 empties: proposals `(none)` + markers `(none)` (grep exit 1 on no matches is NOT a failure)",
    prB?.[0] === "(none)" && mkB?.[0] === "(none)", JSON.stringify([prB, mkB]));
  const loopB2 = sectionBody(l2, "loop");
  chk("(27) FX2 loop: `loop/quiet.md` only, NO autorun-* dir → the EMPTY form `no-looprun`",
    loopB2?.length === 1 && loopB2[0] === "no-looprun", JSON.stringify(loopB2));
  cleanup2();
}

// ------------------------------------------------------------------ FX3 — the 150-line hard cap (158-line digest → trims 8)

const ROOT3 = path.join(SCRATCH, "fx3");
{
  w(ROOT3, "agent/handover/handover_planner.md", "small nap\n");
  const big = Array.from({ length: 40 }, (_, i) => `--now marker line ${i + 1}`).join("\n");
  w(ROOT3, "maintainer/big.md", big + "\n");
  for (let i = 1; i <= 100; i++) w(ROOT3, `proposals/p${String(i).padStart(3, "0")}.md`, "p\n");
  w(ROOT3, "maintainer/priority.md", Array.from({ length: 12 }, (_, i) => `prio ${i + 1}`).join("\n") + "\n");
  const td = ["# TODO"];
  for (let i = 1; i <= 20; i++) td.push("", `## #${i}. Header ${i}`);
  w(ROOT3, "TODO.md", td.join("\n") + "\n");
}
{
  const cleanup3 = await plugin.setup(makeCtx(ROOT3));
  const T3 = TOOLS[2];
  const l3 = digestOf((await T3.execute({}, { agent: "planner_Q3S" })).output);
  const idx3 = ["git", "nap", "todo", "loop", "maintainer", "proposals", "markers"].map((n) => l3.indexOf(`## ${n}`));
  const mk3 = sectionBody(l3, "markers");
  const pr3 = sectionBody(l3, "proposals");
  chk("(20) FX3 cap: EXACTLY 150 lines, all seven headers preserved",
    l3.length === 150 && idx3.every((x) => x >= 0) && idx3.every((x, i) => i === 0 || x > idx3[i - 1]), `len=${l3.length} idx=${JSON.stringify(idx3)}`);
  chk("(21) FX3 cap: the markers steer `… (+20 more)` survives (steer lines never trim)",
    mk3?.includes("… (+20 more)"), JSON.stringify(mk3?.slice(-2)));
  chk("(22) FX3 cap: the LAST section's content lines trimmed from the end backwards (markers keeps 12 of 20), proposals INTACT 100",
    mk3?.filter((l) => l.startsWith("maintainer/big.md")).length === 12 && pr3?.length === 100, `mk=${mk3?.length} pr=${pr3?.length}`);
  cleanup3();
}

// ------------------------------------------------------------------ FX4 — the looprun fixture (spec #155): the PRESENT form + the counter fail-closes
// (its own `setup` retargets the repo-root carrier — the root-carrier trap)

const ROOT4 = path.join(SCRATCH, "fx4");
{
  w(ROOT4, "TODO.md", "# TODO\n");
  w(ROOT4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":7}');
  w(ROOT4, "loop/autorun-X/loop_log.md", "2026-10-26_12-00 -->START planner_fx4 model info\n");
}
{
  const cleanup4 = await plugin.setup(makeCtx(ROOT4));
  const T4 = TOOLS[3];
  const digest4 = async () => digestOf((await T4.execute({}, { agent: "planner_Q3S" })).output);
  const lp = sectionBody(await digest4(), "loop");
  chk("(28) FX4 loop PRESENT form byte-exact `loop=autorun-X ITER=7 log=loop/autorun-X/loop_log.md`",
    lp?.length === 1 && lp[0] === "loop=autorun-X ITER=7 log=loop/autorun-X/loop_log.md", JSON.stringify(lp));
  w(ROOT4, "loop/autorun-X/counter.json", '{"looprun":"autorun-Y","n":7}');
  const mismatch = sectionBody(await digest4(), "loop");
  rmSync(path.join(ROOT4, "loop", "autorun-X", "counter.json"), { force: true });
  const missing = sectionBody(await digest4(), "loop");
  w(ROOT4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":"seven"}');
  const badN = sectionBody(await digest4(), "loop");
  rmSync(path.join(ROOT4, "loop", "autorun-X"), { recursive: true, force: true });
  const emptyLoop = sectionBody(await digest4(), "loop");
  chk("(29) FX4 loop fail-closes: `looprun` MISMATCH / missing counter / non-integer n / EMPTY `loop/` dir → `no-looprun`",
    mismatch?.length === 1 && mismatch[0] === "no-looprun" &&
      missing?.length === 1 && missing[0] === "no-looprun" &&
      badN?.length === 1 && badN[0] === "no-looprun" &&
      emptyLoop?.length === 1 && emptyLoop[0] === "no-looprun",
    JSON.stringify({ mismatch, missing, badN, emptyLoop }));
  cleanup4();
}

// ------------------------------------------------------------------ FXH — the #164 loop-root helper (direct fail-close pins, DoD 3)
// The digest's `## loop` leg resolves the folder + counter through the ONE
// read-only helper `.opencode/plugins/scripts/loop_root.mjs` — pin its
// exported surface HERE so the shared fail-closed legs are pinned directly
// (not only through the readers): absent-root legs, the folder-resolution
// rules (sole / newest-mtime), and the counter-read fail-closes (absent →
// null AND never created / unparseable / array / scalar / null → null).

const HROOT = path.join(SCRATCH, "helper-root");
{
  const helper = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugins", "scripts", "loop_root.mjs")).href);
  chk("(30) helper: ABSENT loop root → listLoopFolders [] + currentLoopFolder null (no throw)",
    helper.listLoopFolders(path.join(HROOT, "nope")).length === 0 && helper.currentLoopFolder(path.join(HROOT, "nope")) === null);
  const loopH = path.join(HROOT, "loop");
  w(HROOT, "loop/autorun-B/seed.txt", "b\n");
  w(HROOT, "loop/autorun-A/seed.txt", "a\n");
  w(HROOT, "loop/not-an-autorun/seed.txt", "x\n");
  w(HROOT, "loop/plain.txt", "file, not a folder\n");
  const listed = helper.listLoopFolders(loopH);
  chk("(31) helper listLoopFolders: only `autorun-*` DIRECTORIES, sorted",
    listed.join(",") === "autorun-A,autorun-B", JSON.stringify(listed));
  {
    // mtime-steered both ways: both folders OLD, then autorun-B newer → the
    // newest-mtime leg is deterministic (no wall-clock ordering assumptions).
    const old = new Date(Date.now() - 120000);
    utimesSync(path.join(loopH, "autorun-A"), old, old);
    utimesSync(path.join(loopH, "autorun-B"), old, old);
    const newer = new Date(Date.now() + 60000);
    utimesSync(path.join(loopH, "autorun-B"), newer, newer);
    chk("(32) helper currentLoopFolder: SEVERAL → the MOST-RECENTLY-MODIFIED (utimes-steered → autorun-B)",
      helper.currentLoopFolder(loopH) === "autorun-B", helper.currentLoopFolder(loopH));
    utimesSync(path.join(loopH, "autorun-A"), newer, newer);
    chk("(33) helper currentLoopFolder: mtime flip → autorun-A (the rule, not an ordering accident)",
      helper.currentLoopFolder(loopH) === "autorun-A", helper.currentLoopFolder(loopH));
  }
  {
    // sole-folder case on its own root
    const solo = path.join(HROOT, "solo");
    w(solo, "loop/autorun-S/seed.txt", "s\n");
    chk("(34) helper currentLoopFolder: exactly ONE folder → it (absent counter is irrelevant)",
      helper.currentLoopFolder(path.join(solo, "loop")) === "autorun-S", helper.currentLoopFolder(path.join(solo, "loop")));
  }
  chk("(35) helper loopCounterPath form + VALID counter read (object with looprun/n)",
    helper.loopCounterPath(loopH, "autorun-A") === path.join(loopH, "autorun-A", "counter.json") &&
      (() => {
        w(HROOT, "loop/autorun-A/counter.json", '{"looprun":"autorun-A","n":7}');
        const c = helper.readLoopCounter(loopH, "autorun-A");
        return c !== null && c.looprun === "autorun-A" && c.n === 7;
      })());
  chk("(36) helper readLoopCounter fail-closes → null: absent (NEVER created) / unparseable / array / scalar / null",
    helper.readLoopCounter(loopH, "autorun-B") === null &&
      !existsSync(path.join(loopH, "autorun-B", "counter.json")) &&
      (() => {
        w(HROOT, "loop/autorun-A/counter.json", "{not json");
        if (helper.readLoopCounter(loopH, "autorun-A") !== null) return false;
        w(HROOT, "loop/autorun-A/counter.json", "[1,2]");
        if (helper.readLoopCounter(loopH, "autorun-A") !== null) return false;
        w(HROOT, "loop/autorun-A/counter.json", "5");
        if (helper.readLoopCounter(loopH, "autorun-A") !== null) return false;
        w(HROOT, "loop/autorun-A/counter.json", "null");
        return helper.readLoopCounter(loopH, "autorun-A") === null;
      })());
}

// ------------------------------------------------------------------ Z cleanup

cleanup1();
chk("Z the teardowns dispose their registrations (4 setups, 4 disposals)", DISPOSED === 4, `disposed=${DISPOSED}`);

console.log(failures === 0 ? "SMOKE: ALL PASS" : `SMOKE: ${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
