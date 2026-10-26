// state_snapshot.smoke.mjs — the state_snapshot custom tool (the approved
// p3-state-snapshot proposal, proposals/approved/2026-09-18_p3-state-
// snapshot-tool.md; spec agent/handover/handover_task.md). It tests
// .opencode/tools/state_snapshot.ts — the tool's execute() driven against
// THREE FIXTURE repos built in freshSandbox (NEVER the live repo):
// FX1 = the full fixture (git init + 2 commits: a TODO.md with 3 entry
// headers, a 45-line NAP, a maintainer/inbox_planner/ with 2 .md files +
// README.md, a 1-line maintainer/priority.md, a proposals/ root with 2
// .md files + 1 subfolder, one --now marker line in proposals/approved/notes.md (DOC-CLASS
// hit — kept by the path-anchored doc-noise filter and raw-printed BEFORE WIKI.md, so
// the ordering pin below stays discriminating) + one --main line in WIKI.md (LIVE-CLASS
// hit — the ordering pin: LIVE-class FIRST) + one --now line in each DOC-QUOTE fixture
// agent/prompts/quoted.md, loop/hidden.md, proposals/implemented/quoted.md (paths the
// doc-noise filter must drop) + one --now line in proposals/approved/ref.md whose TEXT
// quotes agent/readme INLINE (path-anchored filter must KEEP that hit) + a filtered
// maintainer/done/ fixture whose --now line the sweep's older grep -v filter must
// remove) — the assembled
// digest is EXACTLY 62 lines (no truncation); FX2 = the minimal fixture
// (no git, no NAP, empty inbox, no priority, no proposals → every
// fail-closed / empty line); FX3 = the oversized fixture (20 TODO headers
// + 30 priority lines + 30 proposals + 40 marker lines in maintainer/big.md
// → the 150-line hard cap: the LAST section's lines truncate first, all seven
// headers + the markers steer survive). The 15-cap TODO behavior is pinned by extending
// FX1's TODO.md in place (17 headers → the LAST 15 shown). FX4/FX5 (spec #155) pin
// the two `## loop` forms: FX4 = one `loop/autorun-X/` folder with a readable
// counter.json → the present line; FX5 = an empty `loop/` dir → `no-looprun`
// (+ the counter fail-closes: a `looprun` mismatch and an unreadable counter
// → `no-looprun`).
// Run: node .opencode/plugins/tests/v1/state_snapshot.smoke.mjs (plain node,
// exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const { chk, finish } = makeChecker("STATE_SNAPSHOT_SMOKE");

// ------------------------------------------------------------------ fixture builders
const write = (root, rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

const git = (root, ...args) => execFileSync("git", args, { cwd: root });

// FX1 — the full fixture (the digest is EXACTLY 62 lines — under the
// 150-line cap it is NOT truncated:
// git 2 + nap 40+steer + todo 1+3 + loop 1 (FX1 has NO autorun-* dir — only
// the loop/hidden.md FILE — so the empty `no-looprun` line) + maintainer 2+1 +
// proposals 2 + markers 2 (the LIVE hit + the kept DOC hit — the excluded
// doc-quote fixtures add ZERO marker lines) = 55 content + 7 headers = 62 — no
// truncation).
const FX1 = freshSandbox("state_snapshot_fx1");
write(FX1, "TODO.md", [
  "# TODO",
  "",
  "## #1. Alpha item",
  "body alpha",
  "",
  "## #2. Beta item",
  "body beta",
  "",
  "## #3. Gamma item",
  "body gamma",
].join("\n"));
const napLines = [];
for (let i = 1; i <= 45; i++) napLines.push(`nap line ${i}`);
write(FX1, "agent/handover/handover_planner.md", napLines.join("\n"));
write(FX1, "maintainer/inbox_planner/README.md", "inbox readme — excluded from the digest");
write(FX1, "maintainer/inbox_planner/alpha-inbox.md", "inbox alpha first line\nalpha second");
write(FX1, "maintainer/inbox_planner/beta-inbox.md", "inbox beta first line");
write(FX1, "maintainer/priority.md", "priority line 1\n");
write(FX1, "proposals/proposal_a.md", "proposal a body\n");
write(FX1, "proposals/proposal_b.md", "proposal b body\n");
write(FX1, "proposals/approved/inner.md", "inner — a subfolder file, never listed\n");
write(FX1, "proposals/approved/notes.md", "approved note\n--now ship the snapshot\n");
write(FX1, "agent/prompts/quoted.md", "prompt doc\n--now quoted in an excluded path\n");
write(FX1, "loop/hidden.md", "loop doc\n--now quoted in an excluded path\n");
write(FX1, "proposals/implemented/quoted.md", "implemented doc\n--now quoted in an excluded path\n");
write(FX1, "maintainer/done/done_fixture.md", "--now filtered-out done line\n");
git(FX1, "init", "-q");
git(FX1, "config", "user.email", "fixture@example.com");
git(FX1, "config", "user.name", "Fixture");
git(FX1, "add", "-A");
git(FX1, "commit", "-q", "-m", "fixture commit one");
write(FX1, "WIKI.md", "# wiki\n--main wiki live class marker\n");
git(FX1, "add", "-A");
git(FX1, "commit", "-q", "-m", "fixture commit two");

// FX2 — the minimal fixture: TODO.md only (no git repo, no NAP, empty
// inbox dir, no priority.md, no proposals/ — every section's fail-closed /
// empty line).
const FX2 = freshSandbox("state_snapshot_fx2");
write(FX2, "TODO.md", "# TODO\n");
fs.mkdirSync(path.join(FX2, "maintainer", "inbox_planner"), { recursive: true });

// FX3 — the oversized fixture (no git, no NAP, NO autorun-* folder): the
// 150-line hard cap. todo 1+15 + loop 1 (`no-looprun`) + maintainer (none)+10 +
// proposals 100 + markers 20+steer → 158 lines → the cap trims 8 from the end
// backwards: markers content lines go FIRST (12 of 20 survive + the
// `… (+20 more)` steer — steer lines never trim), the proposals section stays
// INTACT at 100.
const FX3 = freshSandbox("state_snapshot_fx3");
{
  const todo = ["# TODO"];
  for (let i = 1; i <= 20; i++) todo.push("", `## #${i}. Header ${i} body`);
  write(FX3, "TODO.md", todo.join("\n") + "\n");
  const prio = [];
  for (let i = 1; i <= 30; i++) prio.push(`priority line ${i}`);
  write(FX3, "maintainer/priority.md", prio.join("\n") + "\n");
  fs.mkdirSync(path.join(FX3, "maintainer", "inbox_planner"), { recursive: true });
  for (let i = 1; i <= 100; i++) write(FX3, `proposals/prop_${String(i).padStart(2, "0")}.md`, `prop ${i}\n`);
  const big = ["big markers"];
  for (let i = 1; i <= 40; i++) big.push(`--now marker line ${i}`);
  write(FX3, "maintainer/big.md", big.join("\n") + "\n");
}

// FX4 — the looprun fixture (spec #155): exactly one `autorun-*` folder with a
// readable counter.json `{"looprun":"autorun-X","n":7}` → the PRESENT loop form.
const FX4 = freshSandbox("state_snapshot_fx4");
write(FX4, "TODO.md", "# TODO\n");
write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":7}');
write(FX4, "loop/autorun-X/loop_log.md", "2026-10-26_12-00 -->START planner_fx4 model info\n");

// FX5 — the empty-looprun fixture (spec #155): `loop/` exists with NO autorun-*
// subdirectory → the EMPTY loop form.
const FX5 = freshSandbox("state_snapshot_fx5");
write(FX5, "TODO.md", "# TODO\n");
fs.mkdirSync(path.join(FX5, "loop"), { recursive: true });

// ------------------------------------------------------------------ the tool
const toolMod = await loadRepo(".opencode/tools/state_snapshot.ts");
const ssTool = toolMod.default;
const run = (root, agent) => ssTool.execute({}, agent === undefined ? { directory: root } : { directory: root, agent });
const sectionBody = (digest, name) => {
  const lines = digest.split("\n");
  const start = lines.indexOf(`## ${name}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].startsWith("## ")) { end = i; break; }
  return lines.slice(start + 1, end);
};

const d1 = await run(FX1, "planner_Q3S");
const l1 = d1.split("\n");

// 1 — the tool() default export shape: description (non-empty string) +
//      execute (function) + the args key list EMPTY (zero args) + NO `name`
//      field (the host names the tool by FILENAME)
chk(
  "tool shape: description non-empty string + execute function + args keys empty + no name field",
  ssTool != null && typeof ssTool.description === "string" && ssTool.description.length > 0 &&
    typeof ssTool.execute === "function" &&
    JSON.stringify(Object.keys(ssTool.args ?? {})) === JSON.stringify([]) &&
    !("name" in ssTool),
  JSON.stringify({ keys: Object.keys(ssTool ?? {}), args: Object.keys(ssTool?.args ?? {}) }),
);

// 2 — the seven section headers present IN ORDER (`loop` AFTER `todo`, BEFORE
//      `maintainer`) + the assembled digest is EXACTLY 62 lines (the FX1 fixture
//      is sized to land on the cap with no truncation)
{
  const idx = ["git", "nap", "todo", "loop", "maintainer", "proposals", "markers"].map((n) => l1.indexOf(`## ${n}`));
  const inOrder = idx.every((v) => v >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]);
  chk("seven section headers in order (loop after todo, before maintainer) + the digest is exactly 62 lines (no truncation)", inOrder && l1.length === 62, JSON.stringify({ idx, len: l1.length }));
}

// 3 — the git section carries the fixture commit subjects (git log
//      --oneline -20, execFileSync args array)
{
  const g = sectionBody(d1, "git");
  chk("git section carries the fixture commit subjects", Array.isArray(g) && g.some((l) => l.includes("fixture commit one")) && g.some((l) => l.includes("fixture commit two")), JSON.stringify(g));
}

// 4 — the nap section = the FIRST 40 lines of the 45-line NAP + the steer
//      line (byte-exact)
{
  const n = sectionBody(d1, "nap");
  const expect = napLines.slice(0, 40);
  const ok = Array.isArray(n) && n.length === 41 && n.slice(0, 40).every((l, i) => l === expect[i]) &&
    n[40] === "… (read agent/handover/handover_planner.md for the rest)";
  chk("nap section = first 40 lines + the read-more steer", ok, JSON.stringify({ len: n?.length, last: n?.[40] }));
}

// 5 — the todo section: the count of ALL headers on the first line + the
//      last-15 behavior (3 headers → all 3, file order, the remainder
//      truncated to 60 chars)
{
  const t = sectionBody(d1, "todo");
  const ok = Array.isArray(t) && t.length === 4 &&
    t[0] === "3 open-entry headers" &&
    t[1] === "#1 — Alpha item" && t[2] === "#2 — Beta item" && t[3] === "#3 — Gamma item";
  chk("todo count line + the 3 headers (file order, truncated remainder)", ok, JSON.stringify(t));
}

// 6 — the todo 15-CAP: extend the fixture TODO.md to 17 headers → the
//      count line 17 + the LAST 15 headers requested (#3..#17, 16 lines —
//      under the 150-line cap the extended digest (74 lines) is NOT trimmed
//      at all: the pure 15-cap leg; the cap itself is pinned at FX3)
{
  const extra = [];
  for (let i = 4; i <= 17; i++) extra.push("", `## #${i}. Extra header ${i}`);
  write(FX1, "TODO.md", fs.readFileSync(path.join(FX1, "TODO.md"), "utf8") + extra.join("\n") + "\n");
  const t = sectionBody(await run(FX1, "planner_Q3S"), "todo");
  const ok = Array.isArray(t) && t.length === 16 &&
    t[0] === "17 open-entry headers" &&
    t[1] === "#3 — Gamma item" && t[15] === "#17 — Extra header 17";
  chk("todo 15-cap: count line 17 + the LAST 15 requested (#3..#17; the extended digest is under the 150-line cap, untrimmed)", ok, JSON.stringify({ len: t?.length, first: t?.[1], last: t?.[15] }));
}

// 7 — the maintainer section: the 2 inbox filenames + first lines (README.md
//      excluded)
{
  const m = sectionBody(d1, "maintainer");
  const ok = Array.isArray(m) &&
    m.includes("alpha-inbox.md: inbox alpha first line") &&
    m.includes("beta-inbox.md: inbox beta first line") &&
    m.every((l) => !l.startsWith("README.md"));
  chk("maintainer: the 2 inbox filenames + first lines, README.md excluded", ok, JSON.stringify(m));
}

// 8 — the maintainer section: priority.md's first line(s) after the inbox
//      list
{
  const m = sectionBody(d1, "maintainer");
  const ok = Array.isArray(m) && m.includes("priority line 1") &&
    m.indexOf("priority line 1") > m.indexOf("beta-inbox.md: inbox beta first line");
  chk("maintainer: priority.md's first lines after the inbox list", ok, JSON.stringify(m));
}

// 9 — the proposals section: the root .md FILENAMES only (files only — the
//      subfolder excluded)
{
  const p = sectionBody(d1, "proposals");
  const ok = Array.isArray(p) && p.length === 2 && p.includes("proposal_a.md") && p.includes("proposal_b.md") &&
    p.every((l) => !l.includes("inner"));
  chk("proposals: the 2 root filenames, the subfolder excluded", ok, JSON.stringify(p));
}

// 10 — the markers section carries the fixture --now line (the ready-made
//       sweep, run via bash in the fixture root)
{
  const mk = sectionBody(d1, "markers");
  const ok = Array.isArray(mk) && mk.some((l) => l.includes("proposals/approved/notes.md") && l.includes("--now ship the snapshot"));
  chk("markers: the fixture --now line is present", ok, JSON.stringify(mk));
}

// 11 — the markers section does NOT carry the filtered path (the grep -v
//       allow-list filter works: /done/)
{
  const mk = sectionBody(d1, "markers");
  const ok = Array.isArray(mk) && mk.every((l) => !l.includes("done_fixture") && !l.includes("filtered-out"));
  chk("markers: the filtered /done/ fixture line is absent", ok, JSON.stringify(mk));
}

// 12 — FX2: the git fail-closed line (no git repo in the fixture; the line
//       form `(git log failed: <first error line, 80 chars>)`)
{
  const d2 = await run(FX2, "planner_Q3S");
  const g = sectionBody(d2, "git");
  const ok = Array.isArray(g) && g.length === 1 && g[0].startsWith("(git log failed: ");
  chk("FX2 git fail-closed line (no git repo)", ok, JSON.stringify(g));
}

// 13 — FX2: the nap fail-closed line (no NAP file; no throw)
{
  const d2 = await run(FX2, "planner_Q3S");
  const n = sectionBody(d2, "nap");
  const ok = Array.isArray(n) && n.length === 1 && n[0] === "(nap missing: agent/handover/handover_planner.md)";
  chk("FX2 nap fail-closed line (no NAP)", ok, JSON.stringify(n));
}

// 14 — FX2: the todo count of 0 (no entry headers)
{
  const d2 = await run(FX2, "planner_Q3S");
  const t = sectionBody(d2, "todo");
  const ok = Array.isArray(t) && t.length === 1 && t[0] === "0 open-entry headers";
  chk("FX2 todo: 0 open-entry headers", ok, JSON.stringify(t));
}

// 15 — FX2: the maintainer section = (none) + the priority fail-closed line
{
  const d2 = await run(FX2, "planner_Q3S");
  const m = sectionBody(d2, "maintainer");
  const ok = Array.isArray(m) && m.length === 2 && m[0] === "(none)" && m[1] === "(priority.md missing)";
  chk("FX2 maintainer: (none) inbox + the priority fail-closed line", ok, JSON.stringify(m));
}

// 16 — FX2: the proposals + markers empty sections → (none)
{
  const d2 = await run(FX2, "planner_Q3S");
  const p = sectionBody(d2, "proposals");
  const mk = sectionBody(d2, "markers");
  const ok = Array.isArray(p) && p.length === 1 && p[0] === "(none)" &&
    Array.isArray(mk) && mk.length === 1 && mk[0] === "(none)";
  chk("FX2 proposals + markers: the (none) empty lines", ok, JSON.stringify({ p, mk }));
}

// 17 — the non-planner agent stub → the EXACT one-line refusal (no digest)
{
  const r = await run(FX1, "worker_Q3S");
  chk("non-planner agent: the exact refusal line", r === "state_snapshot is the planner init digest — not for worker_Q3S", JSON.stringify(r));
}

// 18 — the agent ABSENT from the context stub (the soft gate passes for the
//       empty string) → the digest
{
  const r = await run(FX2);
  const ok = typeof r === "string" && r.startsWith("## git");
  chk("agent absent: the digest is built (the soft gate passes)", ok, JSON.stringify(r.split("\n")[0]));
}

// 19 — FX3: the 150-line HARD CAP: the assembled digest (158 lines) truncates
//       the LAST section's lines first — exactly 150 lines, all seven headers
//       present, the markers steer `… (+20 more)` survives and the markers
//       section keeps 12 of the 20 shown hits (8 trimmed from the end,
//       steer lines never trim), the proposals section stays INTACT at 100
{
  const d3 = await run(FX3, "planner_Q3S");
  const l3 = d3.split("\n");
  const idx = ["git", "nap", "todo", "loop", "maintainer", "proposals", "markers"].map((n) => l3.indexOf(`## ${n}`));
  const inOrder = idx.every((v) => v >= 0) && idx.every((v, i) => i === 0 || v > idx[i - 1]);
  const mk = sectionBody(d3, "markers");
  const p = sectionBody(d3, "proposals");
  const ok = l3.length === 150 && inOrder &&
    Array.isArray(mk) && mk.length === 13 && mk[12] === "… (+20 more)" &&
    mk.filter((l) => l.startsWith("maintainer/big.md:")).length === 12 &&
    Array.isArray(p) && p.length === 100 && p[0] === "prop_01.md" && p[99] === "prop_99.md";
  chk("FX3 150-line hard cap: 150 lines, all seven headers, the markers steer, markers 12 of 20, proposals INTACT 100", ok, JSON.stringify({ len: l3.length, idx, mkN: mk?.length, p0: p?.[0], p99: p?.[99] }));
}

// 20 — FX3: the todo section is INTACT under the cap (the cap truncates the
//       LAST sections first): the count line 20 + exactly the LAST 15
//       headers (first = #6, last = #20)
{
  const d3 = await run(FX3, "planner_Q3S");
  const t = sectionBody(d3, "todo");
  const ok = Array.isArray(t) && t.length === 16 &&
    t[0] === "20 open-entry headers" &&
    t[1] === "#6 — Header 6 body" && t[15] === "#20 — Header 20 body";
  chk("FX3 todo intact under the cap: count 20 + the LAST 15 (first #6, last #20)", ok, JSON.stringify({ len: t?.length, first: t?.[1], last: t?.[15] }));
}

// 21 — the markers LIVE-FIRST ordering: the LIVE-CLASS fixture hit (WIKI.md
//       `--main`) prints BEFORE the DOC-CLASS proposals/approved/notes.md hit.
//       Pre-change the sweep emits its raw path ARGUMENT order (proposals/
//       BEFORE WIKI.md), so the DOC hit leads — the pin fails on the old
//       ordering.
{
  const mk = sectionBody(d1, "markers");
  const live = mk?.findIndex((l) => l.startsWith("WIKI.md:"));
  const doc = mk?.findIndex((l) => l.startsWith("proposals/approved/notes.md:"));
  const ok = Array.isArray(mk) && live >= 0 && doc >= 0 && live < doc;
  chk("markers: the LIVE-class WIKI.md hit prints BEFORE the DOC-class proposals/approved/notes.md hit", ok, JSON.stringify({ live, doc }));
}

// 22 — the doc-noise pass: the DOC-QUOTE fixture hits (agent/prompts/quoted.md,
//       loop/hidden.md, proposals/implemented/quoted.md) are ABSENT from the
//       markers section while the kept DOC hit + the LIVE hit are PRESENT
{
  const mk = sectionBody(d1, "markers");
  const absent = Array.isArray(mk) && mk.every((l) =>
    !l.startsWith("agent/prompts/quoted.md:") &&
    !l.startsWith("loop/hidden.md:") &&
    !l.startsWith("proposals/implemented/quoted.md:"));
  const present = mk.some((l) => l.startsWith("proposals/approved/notes.md:")) && mk.some((l) => l.startsWith("WIKI.md:"));
  chk("markers: the excluded doc-quote paths ABSENT + the kept paths PRESENT", absent && present, JSON.stringify(mk));
}

// 23 — the path-anchored filter: a KEPT path whose TEXT quotes an excluded
//       tree INLINE (proposals/approved/ref.md — TEXT mentions agent/readme)
//       still prints; and the sweep is the ONLY thing trimmed — the file's
//       other lines stay readable via a follow-up read (digest behavior)
{
  write(FX1, "proposals/approved/ref.md", "--now quote mentions agent/readme INLINE\n");
  const mk = sectionBody(await run(FX1, "planner_Q3S"), "markers");
  const ok = Array.isArray(mk) && mk.some((l) => l.startsWith("proposals/approved/ref.md:"));
  chk("markers: the inline-quote line SURVIVES (the grep -v patterns are path-anchored)", ok, JSON.stringify(mk));
}

// 24 — spec #155 (the `## loop` section): FX1 has NO autorun-* directory (only
//      the loop/hidden.md FILE) → the EMPTY form, positioned AFTER `## todo`
//      and BEFORE `## maintainer`
{
  const lp = sectionBody(d1, "loop");
  const at = l1.indexOf("## loop");
  const ok = Array.isArray(lp) && lp.length === 1 && lp[0] === "no-looprun" &&
    at > l1.indexOf("## todo") && at < l1.indexOf("## maintainer");
  chk("#155 loop: FX1 (no autorun-* dir) → the EMPTY form `no-looprun` (2 lines: header + form)", ok, JSON.stringify({ lp, at }));
}

// 25 — spec #155: FX4's PRESENT form is byte-exact: `loop=<folder> ITER=<n>
//      log=loop/<folder>/loop_log.md` from `counter.json` {"looprun":"autorun-X","n":7}
{
  const lp = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  chk("#155 loop: FX4 present form byte-exact `loop=autorun-X ITER=7 log=loop/autorun-X/loop_log.md`",
    Array.isArray(lp) && lp.length === 1 && lp[0] === "loop=autorun-X ITER=7 log=loop/autorun-X/loop_log.md", JSON.stringify(lp));
}

// 26 — spec #155: FX5's EMPTY form — `loop/` exists but holds NO autorun-*
//      subdirectory → `no-looprun`
{
  const lp = sectionBody(await run(FX5, "planner_Q3S"), "loop");
  chk("#155 loop: FX5 empty `loop/` dir → `no-looprun`", Array.isArray(lp) && lp.length === 1 && lp[0] === "no-looprun", JSON.stringify(lp));
}

// 27 — spec #155: the counter fail-closes on FX4's folder (re-run in place):
//      a `looprun` field that MISMATCHES the folder name / a MISSING counter /
//      a non-integer `n` → all `no-looprun`
{
  write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-Y","n":7}');
  const mismatch = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  fs.rmSync(path.join(FX4, "loop", "autorun-X", "counter.json"));
  const missing = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":"seven"}');
  const badN = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  const ok = mismatch?.length === 1 && mismatch[0] === "no-looprun" &&
    missing?.length === 1 && missing[0] === "no-looprun" &&
    badN?.length === 1 && badN[0] === "no-looprun";
  chk("#155 loop: looprun-mismatch / missing counter / non-integer n → `no-looprun` (fail-closed)", ok, JSON.stringify({ mismatch, missing, badN }));
}

// 28 — #171 (2026-10-26, ROUND counter): a counter carrying an INTEGER
//      `round` prints ` ROUND=<r>` after `ITER=<n>` (` MAINT=1` on every 5th
//      round); a non-integer `round` keeps the OLD byte-exact line
//      (fail-closed — the token is dropped, the line is NOT `no-looprun`).
{
  write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":7,"round":9}');
  const lpR = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  chk("#171 loop: FX4 round=9 → byte-exact `loop=autorun-X ITER=7 ROUND=9 log=loop/autorun-X/loop_log.md`",
    Array.isArray(lpR) && lpR.length === 1 && lpR[0] === "loop=autorun-X ITER=7 ROUND=9 log=loop/autorun-X/loop_log.md",
    JSON.stringify(lpR));
  write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":10,"round":10}');
  const lpM = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  chk("#171 loop: FX4 round=10 → ` MAINT=1` rides the line (every 5th round)",
    Array.isArray(lpM) && lpM.length === 1 && lpM[0] === "loop=autorun-X ITER=10 ROUND=10 MAINT=1 log=loop/autorun-X/loop_log.md",
    JSON.stringify(lpM));
  write(FX4, "loop/autorun-X/counter.json", '{"looprun":"autorun-X","n":7,"round":"nine"}');
  const lpB = sectionBody(await run(FX4, "planner_Q3S"), "loop");
  chk("#171 loop: FX4 non-integer round → the OLD byte-exact line (fail-closed, no ROUND token)",
    Array.isArray(lpB) && lpB.length === 1 && lpB[0] === "loop=autorun-X ITER=7 log=loop/autorun-X/loop_log.md",
    JSON.stringify(lpB));
}

finish();
