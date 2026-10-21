// smoke.mjs — Unit A (TODO #137) v2 intercept observer smoke.
//
// Imports the v2 plugin from the clone by absolute path with a MOCK ctx and
// fires the surviving channels; asserts the intercept.log lines (8-field
// shape, surviving verdicts, ZERO pair/numword lines) + the journals.
// `@opencode/plugin` resolves through the node_modules link to the fork's
// installed workspace (home/Repos/opencode).
//
// Run:  bun run smoke.mjs   (from this directory)

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs";
import { DatabaseSync } from "node:sqlite"; // v2unit1: the session-DB fixture
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/intercept-smoke-v2";
const WS = path.join(SCRATCH, "ws"); // the mock workspace (ctx.location.directory)
const PLUGIN = "repo-root-v2/.opencode/plugins/intercept_observer.ts";
const CLONE_ROOT = "repo-root-v2";
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
mkdirSync(ROOTA, { recursive: true });
mkdirSync(path.join(WS, ".opencode", "temp"), { recursive: true });

const fx = (p) => path.join(WS, p);
writeFileSync(fx("fx/file-4.txt"), "TWIN-CONTENT\n");
writeFileSync(fx("fx/edit-target.txt"), "hello\n");
writeFileSync(fx("fx/read-exact.txt"), "exact\n");
writeFileSync(fx("fx/sub/file-4b.txt"), "SUBTWIN\n");
writeFileSync(fx("fx/dd/x.txt"), "DD\n");

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
    `      "${CLONE_ROOT}": "allow"`,
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
// core (`../plugin/scripts/gauge.mjs`). The smoke STEERS that core — the
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
const gaugeMod = await import(pathToFileURL(path.join(CLONE_ROOT, ".opencode", "plugin", "scripts", "gauge.mjs")).href);
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
  // the 160-char flattenField cap truncates the long absolute value (v1
  // byte-stable behavior) — assert the value PREFIX before the cut
  chk("C11 kind=redirect line (verdict pair-resolved REUSED, no `pair=`)", rd !== undefined && rd[7] === "pair-resolved" && rd[5].includes(`orig=${sibling}`) && rd[5].includes(`value=${ROOTA.slice(0, 20)}`) && !rd[5].includes("pair="), rd ? rd[5] : "no line");
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
  const target = "repo-root-v2/zzz-sibling-dir";
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

await cleanup();
console.log(failures === 0 ? "\nSMOKE: ALL PASS" : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
