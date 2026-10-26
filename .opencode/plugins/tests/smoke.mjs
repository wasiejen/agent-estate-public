// smoke.mjs — Unit A (TODO #137) v2 intercept observer smoke.
//
// Imports the v2 plugin from the clone by absolute path with a MOCK ctx and
// fires the surviving channels; asserts the intercept.log lines (8-field
// shape, surviving verdicts, ZERO pair/numword lines) + the journals.
// `@opencode/plugin` resolves through the node_modules link to the fork's
// installed workspace (home/Repos/opencode).
//
// Run:  bun run smoke.mjs   (from this directory)

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { DatabaseSync } from "node:sqlite"; // v2unit1: the session-DB fixture
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/intercept-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "intercept_observer.ts");
const SID = "ses_smoke000111";

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

// ------------------------------------------------------------------ fixtures

// A configured allowed root OUTSIDE the workspace, under a dedicated
// `roots/` parent — an allowed root INSIDE the workspace would make every
// workspace path under its parent 1:1-map onto it (R8 case ii), which is
// faithful v1 behavior but poisons the other fixtures; and the span below
// must match EXACTLY ONE allowed root (a sibling of `ws` would match both
// `ws` and this root -> 2 hits -> fail-closed).
const ROOTA = path.join(SCRATCH, "roots", "rootA").replace(/\\/g, "/");
rmSync(WS, { recursive: true, force: true });
rmSync(ROOTA, { recursive: true, force: true });
mkdirSync(path.join(WS, "fx"), { recursive: true });
mkdirSync(path.join(WS, "fx", "sub"), { recursive: true });
mkdirSync(path.join(WS, "fx", "dd"), { recursive: true });
// #162-build P-SEG fixture: a SEPARATE root with EXACTLY ONE corpus entry — the
// parent-dir entry cannot tie at seg-d (C5's fail-close), so the segment
// matcher RESOLVES there (d=1, gap=inf).
mkdirSync(path.join(WS, "fx", "segfix"), { recursive: true });
mkdirSync(ROOTA, { recursive: true });
mkdirSync(path.join(WS, ".opencode", "temp"), { recursive: true });

const fx = (p) => path.join(WS, p);
writeFileSync(fx("fx/file-4.txt"), "TWIN-CONTENT\n");
writeFileSync(fx("fx/edit-target.txt"), "hello\n");
writeFileSync(fx("fx/read-exact.txt"), "exact\n");
writeFileSync(fx("fx/sub/file-4b.txt"), "SUBTWIN\n");
writeFileSync(fx("fx/dd/x.txt"), "DD\n");
writeFileSync(fx("fx/segfix/keep-1.txt"), "SEGKEEP\n");

// the mock workspace config (v1 syntax — v2 normalizes it in memory; the
// plugin must resolve the allowed roots from it): ws + scratchpad + rootA
// (the redirect fixture root) + the real clone root (the redirect sibling
// test maps onto it — the smoke mutates args only, the tool never runs).
writeFileSync(
  path.join(WS, "opencode.jsonc"),
  [
    "{",
    '  "permission": {',
    '    "external_directory": {',
    `      "${WS.replace(/\\/g, "/")}": "allow",`,
    `      "home/AppData/Local/Temp/opencode": "allow",`,
    `      "${ROOTA}": "allow",`,
    `      "${CLONE_ROOT.replace(/\\/g, "/")}": "allow"`,
    "    }",
    "  }",
    "}",
    "",
  ].join("\n"),
);

const logPath = fx(".opencode/temp/intercept.log");
const journalWrite = fx(".opencode/temp/journal_write.log");
const journalEdit = fx(".opencode/temp/journal_edit.log");

function readLog() {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => l.split(" | "));
}
function readJournal(p) {
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8").split("\n").filter((l) => l !== "");
}

// ------------------------------------------------------------------ mock ctx

function makeCtx(directory) {
  const hooks = {};
  return {
    location: { directory },
    tool: {
      hook: async (name, cb) => {
        hooks[name] = cb;
        return { dispose: async () => delete hooks[name] };
      },
    },
    fire: async (tool, input) => {
        await hooks["execute.before"]({ tool, sessionID: SID, agent: "smoke", messageID: "msg_0001", id: `call_${tool}_${Math.random().toString(16).slice(2, 6)}`, input });
      },
    _hooks: hooks,
  };
}

// ------------------------------------------------------------------ run

// ------------------------------------------------------------------ the session-DB fixture (v2-migration unit 1, 2026-10-21)
// The plugin's model field reads the session DB through the SHARED gauge
// core (`./scripts/gauge.mjs`). The smoke STEERS that core — the
// SAME module instance the plugin imports — at a FIXTURE DB under the
// scratchpad (NEVER the live `~/.local/share/opencode/opencode.db`): a
// `session_v2` row for the mock SID, the v2 column shape (`model` = the
// JSON `{"id":…}` the reader unwraps).
const FX_MODEL_ID = "smoke-v2-model-120K";
const FX_DB = path.join(SCRATCH, "fx_gauge_v2.db");
{
  rmSync(FX_DB, { force: true });
  const db = new DatabaseSync(FX_DB);
  db.exec("CREATE TABLE session_v2(id TEXT PRIMARY KEY, model TEXT, time_updated INTEGER)");
  db.exec(`INSERT INTO session_v2 VALUES('${SID}', '{"id":"${FX_MODEL_ID}","providerID":"llama-swap"}', 2000)`);
  db.close();
}
const gaugeMod = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugins", "scripts", "gauge.mjs")).href);
gaugeMod.setDbPath(FX_DB); // the plugin's readGauge(undefined, sid) reads THIS file

const plugin = (await import(pathToFileURL(PLUGIN).href)).default;
chk("module: default export is { id, setup }", plugin && typeof plugin === "object" && plugin.id === "intercept" && typeof plugin.setup === "function", JSON.stringify(Object.keys(plugin ?? {})));

const ctx = makeCtx(WS);
const cleanup = await plugin.setup(ctx);
chk("setup: registers the execute.before hook + returns a cleanup", typeof ctx._hooks["execute.before"] === "function" && (typeof cleanup === "function"));

// C1 — read fuzzy RESOLVED (d=1, gap>=2, strict gate: typed path absent,
// canonical exists -> the input.path is MUTATED to the existing file).
{
  const before = readLog().length;
  const input = { path: "fx/file-f4.txt" };
  await ctx.fire("read", input);
  chk("C1 read fuzzy-resolved: input.path mutated to the existing twin", input.path === fx("fx/file-4.txt"), `got ${input.path}`);
  const lines = readLog().slice(before);
  const fr = lines.find((f) => f[7] === "fuzzy-resolved");
  chk("C1 read fuzzy-resolved line (d=1, scope=read implied by absence of scope=write)", fr !== undefined && fr[5].includes("d=1") && fr[5].includes("orig=fx/file-f4.txt") && !fr[5].includes("scope=write"), fr ? fr[5] : "no line");
  chk("C1 field shape (8 fields byte-compat, sid, model resolved from the session_v2 fixture row, tool, verdict)", fr !== undefined && fr.length === 8 && fr[1] === SID && fr[2] === FX_MODEL_ID && fr[3] === "read", fr ? fr.join(" | ") : "no line");
}

// C2 — read fuzzy REJECTED (no close candidate -> fail-closed, input
// untouched, the fuzzy-rejected line with top-3 cands + reason).
{
  const before = readLog().length;
  const input = { path: "fx/zzqq-missing.txt" };
  await ctx.fire("read", input);
  chk("C2 read fuzzy-rejected: input.path untouched", input.path === "fx/zzqq-missing.txt", `got ${input.path}`);
  const lines = readLog().slice(before);
  const frr = lines.find((f) => f[7] === "fuzzy-rejected");
  chk("C2 read fuzzy-rejected line (cands + reason=d-too-high)", frr !== undefined && frr[5].includes("cands=") && frr[5].includes("reason=d-too-high"), frr ? frr[5] : "no line");
}

// C3 — the strict gate fast path: the typed path EXISTS -> no fuzzy line,
// no mutation.
{
  const before = readLog().length;
  const input = { path: "fx/read-exact.txt" };
  await ctx.fire("read", input);
  const lines = readLog().slice(before);
  chk("C3 existing read path: untouched + zero lines", input.path === "fx/read-exact.txt" && lines.length === 0, `lines=${lines.length}`);
}

// C4 — R7.1 dedup collapse: the doubled folder dd/dd collapses to the
// existing dd/x.txt (kind=dedup, d=0 structural).
{
  const before = readLog().length;
  const input = { path: "fx/dd/dd/x.txt" };
  await ctx.fire("read", input);
  chk("C4 dedup collapse: input.path mutated to the collapsed existing path", input.path === fx("fx/dd/x.txt"), `got ${input.path}`);
  const lines = readLog().slice(before);
  const dedup = lines.find((f) => f[7] === "fuzzy-resolved" && f[5].includes("kind=dedup"));
  chk("C4 kind=dedup fuzzy-resolved line (d=0)", dedup !== undefined && dedup[5].includes("d=0"), dedup ? dedup[5] : "no line");
}

// C5 — the R7 segment matcher runs FIRST on a >=2-segment rel arg and
// fail-closes (gap: the parent directory `sub` corpus entry sits at the
// same seg-d — v1 gate behavior), then the char matcher resolves at d=1
// -> input mutated, the char-form fuzzy-resolved line (no kind=seg).
{
  const before = readLog().length;
  const input = { path: "fx/sub/file-4x.txt" };
  await ctx.fire("read", input);
  chk("C5 two-segment near-miss: input.path mutated to the existing sub file", input.path === fx("fx/sub/file-4b.txt"), `got ${input.path}`);
  const lines = readLog().slice(before);
  const fr = lines.find((f) => f[7] === "fuzzy-resolved");
  chk("C5 char-form fuzzy-resolved line (d=1, no kind=seg)", fr !== undefined && fr[5].includes("d=1") && !fr[5].includes("kind=seg"), fr ? fr[5] : "no line");
}

// C6 — edit write-scope fuzzy (d=1, scope=write flag, strict gate).
{
  const before = readLog().length;
  const beforeJ = readJournal(journalEdit).length;
  const input = { path: "fx/edit-targe.txt", oldString: "hello", newString: "hello2" };
  await ctx.fire("edit", input);
  chk("C6 edit fuzzy scope=write: input.path mutated to the existing file", input.path === fx("fx/edit-target.txt"), `got ${input.path}`);
  const lines = readLog().slice(before);
  const fw = lines.find((f) => f[7] === "fuzzy-resolved" && f[5].includes("scope=write"));
  chk("C6 fuzzy-resolved scope=write line (d=1)", fw !== undefined && fw[5].includes("d=1"), fw ? fw[5] : "no line");
  const j = readJournal(journalEdit).slice(beforeJ);
  chk("C6 journal edit: ONE line (5 fields, payload {path, old, new})", j.length === 1 && j[0].split(" | ").length === 5 && j[0].includes('"old":"hello"') && j[0].includes('"new":"hello2"'), j[0] ?? "no line");
}

// C7 — edit write-scope at d=2 (tighter bar -> rejected, fail-closed).
{
  const before = readLog().length;
  const input = { path: "fx/zzzz-missing.txt", oldString: "a", newString: "b" };
  await ctx.fire("edit", input);
  chk("C7 edit d=2: input.path untouched (fail-closed)", input.path === "fx/zzzz-missing.txt", `got ${input.path}`);
  const lines = readLog().slice(before);
  const fwr = lines.find((f) => f[7] === "fuzzy-rejected" && f[5].includes("scope=write"));
  chk("C7 fuzzy-rejected scope=write line (reason=d-too-high)", fwr !== undefined && fwr[5].includes("reason=d-too-high"), fwr ? fwr[5] : "no line");
}

// C8 — M1: the v2 `write` tool is EXCLUDED from the fuzzy channel (the same
// d=1 near-miss that C6 mutated stays untouched; the journal still lands).
{
  const before = readLog().length;
  const beforeJ = readJournal(journalWrite).length;
  const input = { path: "fx/edit-targe.txt", content: "new file" };
  await ctx.fire("write", input);
  chk("C8 write excluded from fuzzy: input.path untouched", input.path === "fx/edit-targe.txt", `got ${input.path}`);
  const lines = readLog().slice(before);
  chk("C8 write excluded from fuzzy: zero fuzzy lines", lines.every((f) => f[7] !== "fuzzy-resolved" && f[7] !== "fuzzy-rejected"), JSON.stringify(lines.map((f) => f[7])));
  const j = readJournal(journalWrite).slice(beforeJ);
  chk("C8 journal write: ONE line (payload = JSON content)", j.length === 1 && j[0].includes('"new file"'), j[0] ?? "no line");
}

// C9 — out-of-sandbox note (read with an absolute out-of-sandbox path).
{
  const before = readLog().length;
  const span = "repo-root-v3/TODO.md";
  const input = { path: span };
  await ctx.fire("read", input);
  const lines = readLog().slice(before);
  const oos = lines.find((f) => f[7] === "out-of-sandbox");
  chk("C9 out-of-sandbox note line (path= the span, root= ws)", oos !== undefined && oos[5].includes(`path=${span}`) && oos[5].includes("root="), oos ? oos[5] : "no line");
}

// C10 — C doubled-segment with the JSON-escaped `\\` collapse: a typed
// Windows path with a doubled folder (under the scratchpad — a small
// corpus) -> path-anomaly doubled=smoke-dd from the COLLAPSED JSON form.
{
  const before = readLog().length;
  const input = { path: "C:\\Users\\operator\\AppData\\Local\\Temp\\opencode\\smoke-dd\\smoke-dd\\x.txt" };
  await ctx.fire("read", input);
  const lines = readLog().slice(before);
  const pa = lines.find((f) => f[7] === "path-anomaly");
  chk("C10 path-anomaly doubled=smoke-dd (the JSON-escaped `\\\\` collapse fires)", pa !== undefined && pa[5] === "doubled=smoke-dd", pa ? pa[5] : "no line");
}
// C10b — the negative control: a clean typed Windows path (no doubled
// segment, the file exists — the fuzzy fast path) logs no path-anomaly.
{
  const before = readLog().length;
  const input = { path: "C:\\Users\\operator\\AppData\\Local\\Temp\\opencode\\intercept-smoke-v2\\ws\\fx\\read-exact.txt" };
  await ctx.fire("read", input);
  const lines = readLog().slice(before);
  chk("C10b clean Windows path: zero path-anomaly lines", lines.every((f) => f[7] !== "path-anomaly"), JSON.stringify(lines.map((f) => f[7])));
}

// C11 — R8 redirect (write tool: the typed path is a direct SIBLING of the
// configured allowed root rootA -> 1:1 map, the input.path is mutated, the
// kind=redirect line, the pair-resolved verdict REUSED, no `pair=` evidence,
// and — because the original span was out-of-sandbox — the NOTE is
// suppressed (recomputed on the effective args).
{
  const before = readLog().length;
  const sibling = path.join(SCRATCH, "roots", "rootB").replace(/\\/g, "/"); // missing sibling of rootA
  const input = { path: sibling, content: "x" };
  await ctx.fire("write", input);
  const target = `${ROOTA}/rootB`;
  chk("C11 R8 redirect: input.path mutated to rootA/rootB", input.path === target, `got ${input.path}`);
  const lines = readLog().slice(before);
  const rd = lines.find((f) => f[5].includes("kind=redirect"));
  // unit B (#140) re-pin: the cut moves BACK to the `value=` path-token start —
  // the value path is DROPPED WHOLE (never a mid-path truncation) and the orig
  // path stays WHOLE (replaces the old mid-path `value=` 20-char-prefix form)
  chk("C11 kind=redirect line (verdict pair-resolved REUSED, no `pair=`; unit B: orig whole, value dropped whole)", rd !== undefined && rd[7] === "pair-resolved" && rd[5] === `kind=redirect tool=write arg=path orig=${sibling} ...` && !rd[5].includes("value=") && !rd[5].includes("pair="), rd ? rd[5] : "no line");
  // the span is under the scratchpad root (in-sandbox): the note never
  // fired, and the effective path lands under the allowed rootA — so no
  // out-of-sandbox line either way (the recompute-on-effective-args path
  // is exercised for real in C13 against the clone root)
  chk("C11 no out-of-sandbox line for the redirected span", lines.every((f) => f[7] !== "out-of-sandbox"), JSON.stringify(lines.map((f) => f[7])));
}

// C12 — R8 redirect fail-closed (a span that maps to 0 allowed roots -> no
// mutation, no line — the out-of-sandbox note stays).
{
  const before = readLog().length;
  const span = "home/Repos"; // parent of the allowed clone root: 0 hits
  const input = { path: span };
  await ctx.fire("read", input);
  const lines = readLog().slice(before);
  chk("C12 fail-closed redirect: input.path untouched", input.path === span, `got ${input.path}`);
  chk("C12 fail-closed redirect: no kind=redirect line", lines.every((f) => !f[5].includes("kind=redirect")), JSON.stringify(lines.map((f) => f[5])));
}

// C13 — R8 redirect, note suppression on the READ tool, against the real
// clone root: the typed span is a sibling of the clone root (fuzzy
// fail-closes on it — the char distance is too high — so the redirect sees
// the original arg), maps 1:1, and the original out-of-sandbox note is
// dropped (the effective path lands under the allowed root).
{
  const before = readLog().length;
  const span = "home/Repos/zzz-sibling-dir";
  const input = { path: span };
  await ctx.fire("read", input);
  const target = path.join(CLONE_ROOT, "zzz-sibling-dir").replace(/\\/g, "/");
  chk("C13 R8 redirect (read): input.path mutated under the clone root", input.path === target, `got ${input.path}`);
  const lines = readLog().slice(before);
  const rd = lines.find((f) => f[5].includes("kind=redirect"));
  chk("C13 kind=redirect line present", rd !== undefined, "no line");
  chk("C13 the out-of-sandbox note is suppressed (recomputed on the effective args)", lines.every((f) => f[7] !== "out-of-sandbox"), JSON.stringify(lines.map((f) => f[7])));
}

// C14 — B' HARD-STOP: the edit target OUTSIDE every allowed root whose
// containing directory is MISSING -> the hook THROWS (fails the tool call),
// exactly ONE intercept-error line, the out-of-sandbox note landed first.
{
  const before = readLog().length;
  const span = "home/Repos/v2-smoke-missing-dir/notes.txt";
  const input = { path: span, oldString: "a", newString: "b" };
  let threw = null;
  try {
    await ctx.fire("edit", input);
  } catch (e) {
    threw = e;
  }
  chk("C14 B' hard-stop: the hook THREW (the tool call fails)", threw instanceof Error, threw ? `threw ${threw.constructor.name}: ${threw.message.slice(0, 80)}` : "no throw");
  const lines = readLog().slice(before);
  const errs = lines.filter((f) => f[7] === "error");
  chk("C14 exactly ONE intercept-error line (verdict=error)", errs.length === 1 && errs[0][4] === "intercept-error" && errs[0][5].includes(span), JSON.stringify(errs.map((f) => f[5])));
  chk("C14 the out-of-sandbox note landed before the error", lines.some((f) => f[7] === "out-of-sandbox"), JSON.stringify(lines.map((f) => f[7])));
  chk("C14 the thrown error carries the hard-stop message", threw !== null && threw.message.includes("out-of-sandbox path with missing containing directory"), threw ? threw.message.slice(0, 80) : "no throw");
}

// C15 — B' passes for an in-root missing-directory write (the write tool's
// create-dirs path owns it — no throw, no intercept-error line).
{
  const before = readLog().length;
  const input = { path: "fx/new-subdir/brand-new.txt", content: "hi" };
  let threw = null;
  try {
    await ctx.fire("write", input);
  } catch (e) {
    threw = e;
  }
  chk("C15 in-root new-directory write: no throw", threw === null, threw ? threw.message.slice(0, 80) : "");
  const lines = readLog().slice(before);
  chk("C15 in-root new-directory write: no intercept-error line", lines.every((f) => f[7] !== "error"), JSON.stringify(lines.map((f) => f[7])));
}

// C16 — B' passes for an EXISTING external path (containing directory
// exists) — the host permission gate owns it, the hook must not throw.
{
  const before = readLog().length;
  const span = "home/Repos/opencode/package.json"; // exists, outside every root
  const input = { path: span, content: "x" };
  let threw = null;
  try {
    await ctx.fire("write", input);
  } catch (e) {
    threw = e;
  }
  chk("C16 existing external path: no throw (the permission gate owns it)", threw === null, threw ? threw.message.slice(0, 80) : "");
  const lines = readLog().slice(before);
  chk("C16 existing external path: no intercept-error line", lines.every((f) => f[7] !== "error"), JSON.stringify(lines.map((f) => f[7])));
}

// C-B — unit B FIELD CONTENT rule (TODO #140, clone twin): a single path-shaped
// field prints WHOLE (raised cap MAX_PATH_FIELD_CHARS=1024); a mixed prose+path
// field's cut moves BACK — never mid-path; the 8-field shape byte-compatible.
{
  const SEG = "seg-abcdefgh";
  const LDP = [SCRATCH, SEG, SEG, SEG, SEG, SEG, SEG, SEG, SEG, SEG, "leaf.txt"].join("/"); // >160 chars, 1 token
  const before = readLog().length;
  await ctx.fire("read", { path: LDP });
  const lines = readLog().slice(before);
  const pa = lines.find((f) => f[7] === "path-anomaly");
  chk("C-B1 long doubled path via the hook: the anomaly line has EXACTLY 8 fields, field 4 = the WHOLE JSON arg, NO `...` anywhere in the line (line > 160)", pa !== undefined && pa.length === 8 && pa[4] === JSON.stringify({ path: LDP }) && pa.join(" | ").length > 160 && !pa.join(" | ").includes("..."), pa ? pa.join(" | ") : "no line");
  // C-B2: the leading-path + prose out-of-sandbox note > cap -> no valid head
  // position -> the short summary form (slice + `...`) — measured, pinned
  const SPAN = "home/" + "deep-dir-".repeat(16) + "x.txt"; // 168 > 160
  const expectedNote = `path=${SPAN} root=`.slice(0, 157) + "...";
  const before2 = readLog().length;
  await ctx.fire("read", { path: SPAN });
  const lines2 = readLog().slice(before2);
  const ob = lines2.find((f) => f[7] === "out-of-sandbox");
  chk("C-B2 long out-of-sandbox note: the arg field 4 prints WHOLE (single path-shaped value under the raised cap) + the evidence falls back to the short summary form (mid-path cut is the documented fallback)", ob !== undefined && ob[4] === JSON.stringify({ path: SPAN }) && ob[5] === expectedNote, ob ? ob[5] : "no line");
  const obLineJoined = ob ? ob.join(" | ") : "";
  chk("C-B3 the out-of-sandbox evidence is the leading-path+prose form: the fallback cut lands inside the FIRST path token (documented), the note line still splits into 8 fields", obLineJoined.split(" | ").length === 8 && obLineJoined.length > 160, obLineJoined);
}

// ------------------------------------------------------------------ the whole-log invariants

{
  const lines = readLog();
  const surviving = new Set(["path-anomaly", "out-of-sandbox", "fuzzy-resolved", "fuzzy-rejected", "pair-resolved", "error"]);
  chk("INV every line: 8 fields + surviving verdict only", lines.length > 0 && lines.every((f) => f.length === 8 && surviving.has(f[7])), JSON.stringify(lines.map((f) => f.length + ":" + f[7]).filter((s) => !s.startsWith("8:"))));
  chk("INV ZERO pair-channel lines (no `pair=` evidence anywhere)", lines.every((f) => !f[5].includes("pair=")), JSON.stringify(lines.filter((f) => f[5].includes("pair=")).map((f) => f[5])));
  chk("INV ZERO numword/dense/redundancy/no-candidate/ambiguous verdicts", lines.every((f) => !/numword|dense|redundancy|no-candidate|ambiguous|date=/i.test(f[5] + " " + f[7])), JSON.stringify(lines.map((f) => f[7])));
  chk("INV every pair-resolved line is a kind=redirect line", lines.filter((f) => f[7] === "pair-resolved").every((f) => f[5].includes("kind=redirect")), JSON.stringify(lines.filter((f) => f[7] === "pair-resolved").map((f) => f[5])));
  chk("INV the model field carries the RESOLVED model id on every line (v2unit1: the `session_v2`-aware reader; the 8-field byte-compat shape unchanged)", lines.every((f) => f[2] === FX_MODEL_ID), JSON.stringify(lines.map((f) => f[2]).filter((m) => m !== FX_MODEL_ID)));
  const jw = readJournal(journalWrite).length;
  const je = readJournal(journalEdit).length;
  chk("INV journals: one line per write call (C8, C11, C15, C16) and per edit call (C6, C7, C14)", jw === 4 && je === 3, `journal_write=${jw} journal_edit=${je}`);
  console.log(`\nlog lines: ${lines.length}`);
}

// ------------------------------------------------------------------ #142 + #138 pins (2026-10-22, v1 parity)
//
// The note + anomaly channels scan the TYPED `path` fields + the allow-list
// roots. FIRED AFTER the whole-log invariants (like the v2unit1 pin below:
// scoped-checked, not swept — the INV journal counts stay C8/C11/C15/C16 +
// C6/C7/C14).
{
  // (i) #142: a write path NESTED under the config-allowed ROOTA → NO out-
  //     of-sandbox line + no kind=redirect (nested → no 1:1 root case; pre-
  //     fix the note fired — ROOTA was absent from the note check). CONTROL
  //     (genuine form): a span under NO allowed root STILL logs the note.
  const nested = `${ROOTA}/nested/deep/x.txt`;
  const beforeI = readLog().length;
  await ctx.fire("write", { path: nested, content: "q" });
  const nlI = readLog().slice(beforeI);
  const beforeK = readLog().length;
  await ctx.fire("read", { path: "C:/Windows/System32/cmd.exe" });
  const nlK = readLog().slice(beforeK);
  chk("#142: a path nested under a config-allowed root (rootA) → NO out-of-sandbox line + no kind=redirect",
    nlI.every((f) => f[7] !== "out-of-sandbox" && !f[5].includes("kind=redirect")), JSON.stringify(nlI.map((f) => f[7])));
  chk("#142 control: an un-allowed path STILL logs the out-of-sandbox note",
    nlK.some((f) => f[7] === "out-of-sandbox" && f[5].includes("path=C:/Windows/System32/cmd.exe")), JSON.stringify(nlK.map((f) => f[7])));
  // (ii) #138: an IN-ROOT write + edit whose PAYLOAD (content/newString)
  //     carries path-looking text (a doubled Windows segment, a /tmp-
  //     redirect token, the grep pattern /^## #120/) → ZERO path verdicts
  //     (pre-fix: path-anomaly doubled=users + the note both fired).
  const PAYLOAD = 'see c:\\users\\users\\x.txt and /tmp-redirect and /^## #120/ here';
  const beforeL = readLog().length;
  await ctx.fire("write", { path: "fx/inroot.txt", content: PAYLOAD });
  const nlL = readLog().slice(beforeL);
  await ctx.fire("edit", { path: "fx/edit-target.txt", oldString: "hello", newString: PAYLOAD });
  const nlM = readLog().slice(beforeL + nlL.length);
  chk("#138: an in-root write/edit payload with path-looking text → ZERO path verdicts",
    nlL.every((f) => f[7] !== "out-of-sandbox" && f[7] !== "path-anomaly") && nlM.every((f) => f[7] !== "out-of-sandbox" && f[7] !== "path-anomaly"),
    JSON.stringify({ w: nlL.map((f) => f[7]), e: nlM.map((f) => f[7]) }));
}

// v2unit1 pin — an id present in NEITHER session table: the reader's not-
// found outcome -> the model field keeps the literal `unknown` (byte-compat,
// never a cross-session fallback to the fixture row's model). Fired DIRECTLY
// on the registered hook with an absent sessionID (ctx.fire pins SID), AFTER
// the whole-log invariants (this line is scoped-checked, not swept).
{
  const before = readLog().length;
  await ctx._hooks["execute.before"]({
    tool: "read",
    sessionID: "ses_absent000000",
    agent: "smoke",
    messageID: "msg_0002",
    id: "call_absent_1",
    input: { path: "fx/file-f4.txt" },
  });
  const lines = readLog().slice(before);
  const fr = lines.find((f) => f[7] === "fuzzy-resolved");
  chk("v2unit1 id in NEITHER table: the model field stays `unknown` (8 fields, sid as given)", fr !== undefined && fr.length === 8 && fr[1] === "ses_absent000000" && fr[2] === "unknown", fr ? fr.join(" | ") : "no line");
}

// ------------------------------------------------------------------ #162-build P-SEG pin (leg 3, 2026-10-26)
//
// The POSITIVE counterpart of C5: a >=2-segment near-miss the R7 segment
// matcher RESOLVES. The corpus under the nearest existing dir (`fx/segfix`)
// is the single file `keep-1.txt` (no dir entry to tie at seg-d) — seg d=1,
// gap=inf -> input.path MUTATED + the `kind=seg` fuzzy-resolved line.
// Scoped-checked after the whole-log invariants (like the #142 pins).
{
  const before = readLog().length;
  const input = { path: "fx/segfix/segmiss/keep-1.txt" };
  await ctx.fire("read", input);
  chk("P-SEG segment-matched read: input.path mutated to the existing seg file", input.path === fx("fx/segfix/keep-1.txt"), `got ${input.path}`);
  const lines = readLog().slice(before);
  const seg = lines.find((f) => f[7] === "fuzzy-resolved" && f[5].includes("kind=seg"));
  chk("P-SEG kind=seg fuzzy-resolved line (scope=read, d=1, gap=inf, orig + whole resolved target)", seg !== undefined && seg[5].includes("scope=read") && seg[5].includes("d=1") && seg[5].includes("gap=inf") && seg[5].includes("orig=fx/segfix/segmiss/keep-1.txt") && seg[5].includes("-> keep-1.txt"), seg ? seg[5] : "no line");
}

// ------------------------------------------------------------------ #162-build P-RED pins (leg 4, 2026-10-26)
//
// The redirect pure-resolver cases (v1 S28/S29 shape) pinned THROUGH the hook
// — deterministic input→output assertions on `resolveRedirect` (no production
// export added). Fired on the `write` tool (M1: write is EXCLUDED from the
// fuzzy channel → the redirect sees the ORIGINAL arg). The bash-`command`
// redirect leg is NOT pinned (retired by design — v2 excludes bash at
// `plugins/intercept_observer.ts:33,822`). Scoped-checked after the invariants.
{
  const SCRATCHPAD = "home/AppData/Local/Temp/opencode"; // the plugin SCRATCHPAD_ROOT constant
  // (vi) POSIX temp-root prefix mapping: /tmp/<rest> → the scratchpad root.
  // The original out-of-sandbox note is suppressed (recomputed on the
  // EFFECTIVE args — the target lands under the allowed scratchpad root).
  const bR1 = readLog().length;
  const inR1 = { path: "/tmp/pin-a/b.txt", content: "x" };
  await ctx.fire("write", inR1);
  chk("P-RED (vi) /tmp span: input.path mutated to the scratchpad root", inR1.path === `${SCRATCHPAD}/pin-a/b.txt`, `got ${inR1.path}`);
  const lR1 = readLog().slice(bR1);
  const rd1 = lR1.find((f) => f[5].includes("kind=redirect"));
  chk("P-RED (vi) kind=redirect line (WHOLE evidence under the length cap: orig + value exact) + note suppressed", rd1 !== undefined && rd1[7] === "pair-resolved" && rd1[5] === `kind=redirect tool=write arg=path orig=/tmp/pin-a/b.txt value=${SCRATCHPAD}/pin-a/b.txt` && !rd1[5].includes("pair=") && lR1.every((f) => f[7] !== "out-of-sandbox"), rd1 ? rd1[5] : JSON.stringify(lR1.map((f) => f[7])));
  // (vi) bare /tmp → the scratchpad root itself.
  const inR2 = { path: "/tmp", content: "x" };
  await ctx.fire("write", inR2);
  chk("P-RED (vi) bare /tmp: input.path mutated to the scratchpad root", inR2.path === SCRATCHPAD, `got ${inR2.path}`);
  // (vi) /var/tmp/<rest> → the scratchpad root (the second temp prefix).
  const bR3 = readLog().length;
  const inR3 = { path: "/var/tmp/pin-c.txt", content: "x" };
  await ctx.fire("write", inR3);
  chk("P-RED (vi) /var/tmp span: input.path mutated under the scratchpad root", inR3.path === `${SCRATCHPAD}/pin-c.txt`, `got ${inR3.path}`);
  const lR3 = readLog().slice(bR3);
  chk("P-RED (vi) /var/tmp kind=redirect line present", lR3.some((f) => f[5].includes("kind=redirect")), JSON.stringify(lR3.map((f) => f[5])));
  // (ii) sibling 1:1 map: a direct sibling of the allowed ws root → ws/<base>.
  const bR4 = readLog().length;
  const sib = `${SCRATCH}/ws-mirror`;
  const inR4 = { path: sib, content: "x" };
  await ctx.fire("write", inR4);
  // The config-root string is slash-normalized → the target is the slash form
  // (path.join's win32 separator would NOT appear in a resolver output).
  chk("P-RED (ii) ws-root sibling: input.path mutated 1:1 under the ws root", inR4.path === `${SCRATCH}/ws/ws-mirror`, `got ${inR4.path}`);
  const lR4 = readLog().slice(bR4);
  chk("P-RED (ii) sibling kind=redirect line present", lR4.some((f) => f[5].includes("kind=redirect")), JSON.stringify(lR4.map((f) => f[5])));
  // (i) exact allowed-root: the resolver returns the root itself -> the
  // `target === raw` no-op (fail-closed) — field untouched, no line.
  const bR5 = readLog().length;
  const inR5 = { path: ROOTA, content: "x" };
  await ctx.fire("write", inR5);
  const lR5 = readLog().slice(bR5);
  chk("P-RED (i) exact allowed-root: untouched (target===raw no-op) + no kind=redirect line", inR5.path === ROOTA && lR5.every((f) => !f[5].includes("kind=redirect")), `got ${inR5.path}`);
  // (iii) nested under an allowed root: no 1:1 case matches -> untouched.
  // (#142 pins the NOTE side; this pins the resolver output side.)
  const bR6 = readLog().length;
  const nestedR = `${ROOTA}/nestedx/y.txt`;
  const inR6 = { path: nestedR, content: "x" };
  await ctx.fire("write", inR6);
  const lR6 = readLog().slice(bR6);
  chk("P-RED (iii) nested under an allowed root: untouched + no kind=redirect line", inR6.path === nestedR && lR6.every((f) => !f[5].includes("kind=redirect")), `got ${inR6.path}`);
  // (iv) non-matching path (0 allowed-root hits): fail-closed untouched, no
  // line, no hard-stop (the containing directory exists → the permission gate).
  const bR7 = readLog().length;
  const miss = "C:/Windows/System32/drivers/etc/hosts";
  const inR7 = { path: miss, content: "x" };
  let threwR7 = null;
  try {
    await ctx.fire("write", inR7);
  } catch (e) {
    threwR7 = e;
  }
  const lR7 = readLog().slice(bR7);
  chk("P-RED (iv) non-matching path: fail-closed untouched + no kind=redirect line + no throw", inR7.path === miss && threwR7 === null && lR7.every((f) => !f[5].includes("kind=redirect")), `got ${inR7.path} threw=${threwR7 ? threwR7.message.slice(0, 40) : "none"}`);
}

// ------------------------------------------------------------------ #162-build P-MIRROR pin (leg 5, 2026-10-26)
//
// The handover-file mirror guarantee (v1 S3 leg): run the observer's
// MUTATING legs — fuzzy-resolved read (char + seg + dedup forms), the
// write-scope edit fuzzy, and an R8 redirect — against the sandbox fixture.
// The protocol files `handover_task.md` / `handover_task_to_planner.md` are
// never a write target: no mutated path carries either name AND no new file
// of either name appears under the sandbox scratch (the mutation only
// mutates ARGS — the tool never runs).
{
  const MIRROR_NAMES = ["handover_task.md", "handover_task_to_planner.md"];
  const mirrorFiles = (d) => readdirSync(d, { recursive: true }).map((r) => path.basename(String(r))).filter((n) => MIRROR_NAMES.includes(n));
  chk("P-MIRROR pre: the sandbox holds NO handover-named file (baseline absent)", mirrorFiles(SCRATCH).length === 0, JSON.stringify(mirrorFiles(SCRATCH)));
  const mutated = [];
  const iM1 = { path: "fx/file-f4.txt" };
  await ctx.fire("read", iM1);
  mutated.push(iM1.path);
  const iM2 = { path: "fx/dd/dd/x.txt" };
  await ctx.fire("read", iM2);
  mutated.push(iM2.path);
  const iM3 = { path: "fx/segfix/segmiss/keep-1.txt" };
  await ctx.fire("read", iM3);
  mutated.push(iM3.path);
  const iM4 = { path: "fx/edit-targe.txt", oldString: "hello", newString: "hello3" };
  await ctx.fire("edit", iM4);
  mutated.push(iM4.path);
  const iM5 = { path: `${SCRATCH}/roots/root-mirror-x`, content: "x" };
  await ctx.fire("write", iM5);
  mutated.push(iM5.path);
  // every leg must have mutated (the legs run on existing/mappable fixtures)
  const untouched = [iM1.path === "fx/file-f4.txt", iM2.path === "fx/dd/dd/x.txt", iM3.path === "fx/segfix/segmiss/keep-1.txt", iM4.path === "fx/edit-targe.txt", iM5.path === `${SCRATCH}/roots/root-mirror-x`];
  chk("P-MIRROR: all five mutating legs ran (every typed path was mutated)", untouched.every((u) => !u), JSON.stringify(untouched));
  chk("P-MIRROR: NO mutated target path carries a handover file name", mutated.every((p) => !MIRROR_NAMES.includes(path.basename(String(p).replace(/\\/g, "/")))), JSON.stringify(mutated));
  chk("P-MIRROR post: no handover-named file appeared in the sandbox", mirrorFiles(SCRATCH).length === 0, JSON.stringify(mirrorFiles(SCRATCH)));
}

// ------------------------------------------------------------------ #179 pins (2026-10-26, spec 179)
//
// Custom-tool path fields: `REDIRECT_PATH_FIELDS` names `block_transfer`
// (typed fields `srcFile`/`dstFile` — `targetMarker` is an insertion point
// INSIDE dstFile, not a separate path) so the redirect + sandbox/anomaly
// channels observe Code-Mode-dispatched custom-tool calls (the fork fires
// execute.before for inner calls — fork tool.ts L241-245). Pin (a) is
// DISCRIMINATING: it FAILS on the unchanged table (the gate names only
// read/write/edit -> pathText "" -> the "nothing to log" return). Scoped-
// checked after the whole-log invariants (the INV journal counts stay
// C8/C11/C15/C16 + C6/C7/C14 — block_transfer fires NO journal line).
// The tool never runs: the hook observes (and may mutate) ARGS only.
{
  const SCRATCHPAD = "home/AppData/Local/Temp/opencode"; // the plugin SCRATCHPAD_ROOT constant
  // (a) discriminating: a WRITE with a dstFile OUT of every allowed root AND
  // outside the scratchpad -> EXACTLY ONE out-of-sandbox verdict line (the
  // tool field is block_transfer; the whole path lands in the evidence).
  // Fail-closed redirect: the span's parent matches no allowed-root parent ->
  // 0 hits -> no mutation, no kind=redirect line. No hard-stop (4b stays
  // native write/edit-only — the planner ruling).
  const bA = readLog().length;
  const out = "C:/ProgramData/bt-spec179-target.txt";
  const inA = { mode: "WRITE", dstFile: out, startMarker: "## TODO", endMarker: "## Notes", text: "x" };
  let threwA = null;
  try {
    await ctx.fire("block_transfer", inA);
  } catch (e) {
    threwA = e;
  }
  const lA = readLog().slice(bA);
  const oosA = lA.find((f) => f[7] === "out-of-sandbox");
  chk("#179 (a) block_transfer out-of-sandbox dstFile: EXACTLY ONE line (out-of-sandbox, tool=block_transfer, whole-path evidence, no redirect line, no throw)",
    threwA === null && lA.length === 1 && oosA !== undefined && oosA.length === 8 && oosA[3] === "block_transfer" && oosA[5].includes(`path=${out}`) && oosA[5].includes("root=") && !lA.some((f) => f[5].includes("kind=redirect")),
    lA.length ? JSON.stringify(lA.map((f) => f[7])) : "no line");
  chk("#179 (a) dstFile untouched (fail-closed redirect — 0 allowed-root hits)", inA.dstFile === out, `got ${inA.dstFile}`);
  // (b) in-sandbox dstFile (directly under the scratchpad root — a sibling
  // parent would 1:1-map onto the scratchpad via case (ii)) -> NO line.
  const bB = readLog().length;
  await ctx.fire("block_transfer", { mode: "WRITE", dstFile: `${SCRATCHPAD}/bt-spec179-ins.txt`, startMarker: "## TODO", endMarker: "## Notes", text: "x" });
  const lB = readLog().slice(bB);
  chk("#179 (b) block_transfer in-scratchpad dstFile: zero lines (no noise)", lB.length === 0, JSON.stringify(lB.map((f) => f[7])));
  // (c) #138 discipline KEPT: the `execute` meta-tool stays UNOBSERVED — a
  // path-looking substring inside its free-text `code` is never a path
  // candidate (zero lines even for a genuine out-of-sandbox path inside it).
  const bC = readLog().length;
  await ctx.fire("execute", { code: 'tools.block_transfer({ mode: "MAP", bufferName: "b1", dstFile: "C:/Windows/System32/cmd.exe" })' });
  const lC = readLog().slice(bC);
  chk("#179 (c) execute code carrying an out-of-sandbox path: zero lines (free text is never a path candidate)", lC.length === 0, JSON.stringify(lC.map((f) => f[7])));
  // (d) a block_transfer call carrying ONLY markers/line numbers (+ a buffer
  // name) — no string path fields -> pathText "" -> zero lines.
  const bD = readLog().length;
  await ctx.fire("block_transfer", { mode: "REPLACE", bufferName: "b1", startMarker: "## TODO", endMarker: "## Notes" });
  const lD = readLog().slice(bD);
  chk("#179 (d) block_transfer markers-only call: zero lines (no typed path fields present)", lD.length === 0, JSON.stringify(lD.map((f) => f[7])));
}

await cleanup();
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
