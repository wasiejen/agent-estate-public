// block_transfer.sandbox.smoke.mjs — TODO #137 unit 5c: the v2 block_transfer
// sandbox twin smoke. bun, MOCK ctx. Pins the MAIN twin's CURRENT sandbox form:
// roots = [CWD root, ...config allow roots (read ONCE at import from the plugin's
// OWN repo root opencode.jsonc), TEMP/TMP env OVERRIDE, os.tmpdir()] deduped by
// EXACT string equality; the byte-exact deny line
// `Error: '<givenPath>' is outside the sandbox (allowed: <roots>)`; the guard
// BEFORE any fs access (sandbox error wins over 'not found' and, for REPLACE,
// over the empty-buffer check; MOVE guards the dst before the source is touched);
// config BOTH-shape support (the on-disk v1 object form AND the v2 native array
// form — LAST MATCH WINS, /** stripped, dedupe) via fixture-repo plugin copies
// (plugin file copied to <fx-repo>/.opencode/plugins/, so its own-repo-root read
// hits the fixture config); unreadable/malformed config -> EMPTY set (fail-open
// to CWD+temp roots ONLY, NEVER "everything allowed").
// MATRIX PLACEMENT: every DENY path sits OUTSIDE ALL roots (the scratchpad and
// the TEMP override are CONFIG/temp roots of the REAL clone config — deny fixtures
// live as direct children of the user Temp dir and as siblings of the fixture
// repos, which themselves sit OUTSIDE the scratchpad subtree); the allow fixtures
// then discriminate: a sibling dir is reachable ONLY when the fixture config
// lists it. ENV-ROBUST FIXTURE TEMP (v1 mechanism): the smoke SELF-SETS TEMP/TMP
// to its own fixture root (under the user Temp dir, outside the scratchpad
// subtree); on Windows os.tmpdir() then == TEMP, so the roots list dedupes to the
// byte-exact short form; the ambient values are restored at the end.
// Run: bun run block_transfer.sandbox.smoke.mjs (this dir). Final line `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";

const SCRATCHPAD = "home/AppData/Local/Temp/opencode";
const SCRATCH = path.join(SCRATCHPAD, "block-transfer-sandbox-smoke-v2");
const SCRATCH2 = path.join(SCRATCHPAD, "..", "bt_fx_sandbox_v2"); // fixture repos OUTSIDE the scratchpad config root
// The repo root this suite lives in (`.opencode/plugins/tests` -> up 3). Resolved
// from the file so the suite runs in whatever checkout owns the tests dir — the
// old absolute archived-clone path no longer exists on this machine (TODO #156,
// 2026-10-26).
const CLONE_ROOT = path.join(import.meta.dirname, "..", "..", "..");
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "block_transfer.ts");

const ambientTEMP = process.env.TEMP;
const ambientTMP = process.env.TMP;
const tempRoot = path.join(SCRATCHPAD, "..", "bt_sandbox_env_temp_v2");
process.env.TEMP = tempRoot;
process.env.TMP = tempRoot;
const tmpdir = os.tmpdir();

const restore = () => {
  if (ambientTEMP === undefined) delete process.env.TEMP; else process.env.TEMP = ambientTEMP;
  if (ambientTMP === undefined) delete process.env.TMP; else process.env.TMP = ambientTMP;
};

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else { failures++; console.log(`FAIL  ${label}${detail ? "  [" + String(detail).replace(/\n/g, "\\n").slice(0, 300) + "]" : ""}`); }
}

// ---- test-side mirrors (the v1 smoke's mechanism)
function stripJsonc(text) {
  let out = "", i = 0, inS = false, esc = false;
  while (i < text.length) {
    const c = text[i];
    if (inS) { out += c; if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inS = false; i++; continue; }
    if (c === '"') { inS = true; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i += 2; continue; }
    out += c; i++;
  }
  return out;
}
function mirrorConfigRoots(cfgFile) {
  const out = []; const seen = new Set();
  try {
    let text = stripJsonc(readFileSync(cfgFile, "utf-8"));
    text = text.replace(/,(\s*[}\]])/g, "$1");
    const cfg = JSON.parse(text);
    const ext = cfg && cfg.permission && typeof cfg.permission === "object" ? cfg.permission.external_directory : null;
    if (ext && typeof ext === "object") {
      for (const [k, v] of Object.entries(ext)) {
        if (v !== "allow") continue;
        const r = path.resolve(k.endsWith("/**") ? k.slice(0, -3) : k);
        const l = r.toLowerCase();
        if (seen.has(l)) continue;
        seen.add(l);
        out.push(r);
      }
    }
  } catch {}
  return out;
}
function expectedRoots(cwd, cfgRoots) {
  const list = [cwd, ...cfgRoots, process.env.TEMP ?? process.env.TMP, tmpdir].filter((r) => typeof r === "string" && r.length > 0);
  const seen = new Set(); const out = [];
  for (const r of list) { if (seen.has(r)) continue; seen.add(r); out.push(r); } // EXACT equality, as the tool
  return out;
}
function denyLine(given, cwd, cfgRoots) {
  return `Error: '${given}' is outside the sandbox (allowed: ${expectedRoots(cwd, cfgRoots).join(", ")})`;
}
function rootsOf(line) {
  const i = line.indexOf("(allowed: ");
  if (i < 0) return null;
  return line.slice(i + "(allowed: ".length, line.length - 1).split(", ");
}

rmSync(SCRATCH, { recursive: true, force: true });
rmSync(SCRATCH2, { recursive: true, force: true });
rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });
const WS = path.join(SCRATCH, "work");
const REPO = path.join(SCRATCH, "repo"); // the sandbox CWD root for the matrix
for (const d of [WS, REPO, path.join(REPO, "sub")]) mkdirSync(d, { recursive: true });

writeFileSync(path.join(SCRATCH, "cfg_allowed.txt"), "CFG1\nCFG2", "utf-8"); // under scratchpad = clone CONFIG root
writeFileSync(path.join(tempRoot, "tmp_allowed.txt"), "TMP1\nTMP2", "utf-8"); // under the TEMP override
// deny fixtures: direct children of the user Temp dir (outside scratchpad, tempRoot, and cwd):
const outsideRel = path.join(SCRATCHPAD, "..", "bt_sandbox_outside_v2.txt");
const bareTemp = path.join(SCRATCHPAD, "..", "bt_sandbox_baretemp_v2.txt");
const missOutside = path.join(SCRATCHPAD, "..", "bt_sandbox_missing_v2.txt");
for (const p of [outsideRel, bareTemp, missOutside]) rmSync(p, { force: true });
writeFileSync(bareTemp, "BT1", "utf-8");
writeFileSync(path.join(REPO, "sub", "in.txt"), "I1\nI2\n", "utf-8");
const outsideAbs = "C:\\Windows\\System32\\drivers\\etc\\hosts";
const rOut = path.join(CLONE_ROOT, "..", "evil_v2.txt");

// ------------------------------------------------------------------ A: the REAL clone plugin

const CLONE_CFG_ROOTS = mirrorConfigRoots(path.join(CLONE_ROOT, "opencode.jsonc"));
const modA = await import(pathToFileURL(PLUGIN).href);
let DISPOSED = 0;
const TOOLS = [];
const cleanup = await modA.default.setup({
  location: { directory: REPO },
  tool: {
    transform: async (cb) => {
      const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (tt) => TOOLS.push(tt), update: () => {}, remove: () => {} };
      cb(editor);
      return { dispose: async () => { DISPOSED++; } };
    },
    hook: async () => ({ dispose: async () => {} }),
  },
});
const t = TOOLS[TOOLS.length - 1];
const out = async (args) => (await t.execute(args, {})).output;

{
  const o = await out({ mode: "COPY", srcFile: outsideRel, startMarker: "A", endMarker: "B" });
  chk("(A1) deny line BYTE-EXACT vs the mirror (path AS GIVEN; TEMP override == os.tmpdir() dedupes to ONE temp root)",
    o === denyLine(outsideRel, REPO, CLONE_CFG_ROOTS), o);
  rmSync(outsideRel, { force: true });
  chk("(A2) the REJECT never wrote the outside file", !existsSync(outsideRel));
  await out({ mode: "COPY", text: "PB1\nPB2", bufferName: "sb" });
  const o3 = await out({ mode: "PASTE", dstFile: outsideAbs, bufferName: "sb" });
  chk("(A3) absolute Windows system path DENIED (PASTE, non-empty buffer)",
    o3 === denyLine(outsideAbs, REPO, CLONE_CFG_ROOTS), o3);
  const o4 = await out({ mode: "COPY", srcFile: missOutside, startMarker: "A", endMarker: "B" });
  chk("(A4) outside + missing -> SANDBOX error wins (guard BEFORE fs access, no 'not found' leak)",
    o4 === denyLine(missOutside, REPO, CLONE_CFG_ROOTS) && !o4.includes("not found"), o4);
  const o5 = await out({ mode: "REPLACE", dstFile: rOut, startMarker: "A", endMarker: "A", bufferName: "noSuchBuffer" });
  chk("(A5) REPLACE: sandbox BEFORE the empty-buffer check",
    o5 === denyLine(rOut, REPO, CLONE_CFG_ROOTS), o5);
  const o6 = await out({ mode: "MOVE", srcFile: "sub/in.txt", startMarker: "I1", endMarker: "I2", dstFile: rOut });
  chk("(A6) MOVE: dst guard BEFORE the source is touched",
    o6 === denyLine(rOut, REPO, CLONE_CFG_ROOTS), o6);
  chk("(A7) MOVE deny left the source intact", readFileSync(path.join(REPO, "sub", "in.txt"), "utf-8") === "I1\nI2\n");
  const cfgAbs = path.join(SCRATCH, "cfg_allowed.txt");
  const o7 = await out({ mode: "COPY", srcFile: cfgAbs, startMarker: "CFG1", endMarker: "CFG2" });
  chk("(A8) ALLOW via a CONFIG allow root (scratchpad — outside the CWD root)",
    o7 === `Copied 2 lines from '${cfgAbs}' into buffer 'default' (lines 1..2, first: 'CFG1') - buffer: 2 lines.`, o7);
  const o8 = await out({ mode: "COPY", srcFile: path.join(tempRoot, "tmp_allowed.txt"), startMarker: "TMP1", endMarker: "TMP2" });
  chk("(A9) ALLOW via the TEMP env OVERRIDE (outside every config root)",
    o8 === `Copied 2 lines from '${path.join(tempRoot, "tmp_allowed.txt")}' into buffer 'default' (lines 1..2, first: 'TMP1') - buffer: 2 lines.`, o8);
  const o9 = await out({ mode: "COPY", srcFile: bareTemp, startMarker: "BT1", endMarker: "BT1" });
  chk("(A10) a file directly under the user Temp dir is NOT auto-allowed (the OS temp root rides os.tmpdir() == the deduped TEMP override — hardening item 10's EXACT-equality dedupe keeps the Windows roots form byte-exact)",
    o9 === denyLine(bareTemp, REPO, CLONE_CFG_ROOTS), o9);
  rmSync(bareTemp, { force: true });
  const caseVar = "c:" + cfgAbs.slice(2);
  const o10 = await out({ mode: "COPY", srcFile: caseVar, startMarker: "CFG1", endMarker: "CFG2" });
  chk("(A11) case-insensitive root match (lower-case drive variant ALLOWED)",
    o10.startsWith("Copied 2 lines from '"), o10);
  const rl = rootsOf(o3) ?? [];
  const npm = "C:\\Users\\operator\\AppData\\Roaming\\npm";
  const agent = "C:\\Users\\operator\\Repos\\agent-estate";
  chk("(A12) config /** twins DEDUPE: the standalone 'Roaming\\npm' entry ONCE + 'Repos\\agent-estate' ONCE (the /** and -v2 twins do not re-add)",
    rl.filter((s) => s.toLowerCase() === npm.toLowerCase()).length === 1 &&
    rl.filter((s) => s.toLowerCase() === agent.toLowerCase()).length === 1, JSON.stringify(rl));
}

// ------------------------------------------------------------------ B: fixture-repo plugin copies

async function loadFixture(name, cfgText) {
  const root = path.join(SCRATCH2, "fx_" + name); // the fixture CWD root (outside ALL config roots)
  rmSync(root, { recursive: true, force: true });
  mkdirSync(path.join(root, ".opencode", "plugins"), { recursive: true });
  writeFileSync(path.join(root, ".opencode", "plugins", "block_transfer.ts"), readFileSync(PLUGIN, "utf-8"), "utf-8");
  writeFileSync(path.join(root, "opencode.jsonc"), cfgText, "utf-8");
  const mod = await import(pathToFileURL(path.join(root, ".opencode", "plugins", "block_transfer.ts")).href);
  const toolBox = [];
  const clean = await mod.default.setup({
    location: { directory: root },
    tool: {
      transform: async (cb) => {
        const editor = { list: () => [], get: () => undefined, namespace: () => {}, add: (tt) => toolBox.push(tt), update: () => {}, remove: () => {} };
        cb(editor);
        return { dispose: async () => {} };
      },
      hook: async () => ({ dispose: async () => {} }),
    },
  });
  return { root, t: toolBox[0], clean };
}
const FX = SCRATCH2.replace(/\\/g, "/"); // forward-slash form for the JSON config text

{
  // B1/B2: fixture v1 object form — allow dir is a SIBLING of the fixture repo (reachable ONLY via the config root).
  const f = await loadFixture("obj", `{
  // fixture v1 object form
  "permission": {
    "external_directory": {
      "${FX}/fx_obj_allowed": "allow",
      "${FX}/fx_obj_allowed/**": "allow",
      "${FX}/fx_obj_ask": "ask"
    }
  }
}`);
  const okAbs = path.join(SCRATCH2, "fx_obj_allowed", "sub");
  mkdirSync(okAbs, { recursive: true });
  writeFileSync(path.join(okAbs, "al.txt"), "AL1\nAL2", "utf-8");
  const o = await f.t.execute({ mode: "COPY", srcFile: path.join(okAbs, "al.txt"), startMarker: "AL1", endMarker: "AL2" }, {});
  chk("(B1) fixture v1 object form: the dir-key + /** twin = ONE ALLOW root (sibling dir reachable)",
    (o.output ?? "").includes("Copied 2 lines"), o.output);
  const o2 = await f.t.execute({ mode: "COPY", srcFile: path.join(SCRATCH2, "fx_obj_ask", "a.txt"), startMarker: "A", endMarker: "B" }, {});
  chk("(B2) fixture: value 'ask' NEVER a root; deny line lists EXACTLY [cwd, the one fixture root, TEMP deduped]",
    o2.output === denyLine(path.join(SCRATCH2, "fx_obj_ask", "a.txt"), f.root, [path.resolve(FX + "/fx_obj_allowed")]), o2.output);
  f.clean();
}

{
  // B3..B6: v2 native array form — ordered, LAST MATCH WINS, /** stripped, dedupe.
  const f = await loadFixture("arr", `{
  "permissions": [
    { "action": "external_directory", "resource": "${FX}/fx_arr_allowed/**", "effect": "allow" },
    { "action": "external_directory", "resource": "${FX}/fx_arr_allowed", "effect": "allow" },
    { "action": "external_directory", "resource": "${FX}/fx_arr_flip", "effect": "allow" },
    { "action": "external_directory", "resource": "${FX}/fx_arr_flip", "effect": "deny" },
    { "action": "external_directory", "resource": "${FX}/fx_arr_twice", "effect": "allow" },
    { "action": "external_directory", "resource": "${FX}/fx_arr_twice", "effect": "allow" },
    { "action": "edit", "resource": "*", "effect": "allow" }
  ]
}`);
  const okAbs = path.join(SCRATCH2, "fx_arr_allowed");
  mkdirSync(okAbs, { recursive: true });
  writeFileSync(path.join(okAbs, "al.txt"), "AL1\nAL2", "utf-8");
  const o = await f.t.execute({ mode: "COPY", srcFile: path.join(okAbs, "al.txt"), startMarker: "AL1", endMarker: "AL2" }, {});
  chk("(B3) v2 array form: /** + plain ALLOW twins -> ONE root, reachable",
    (o.output ?? "").includes("Copied 2 lines"), o.output);
  const flipAbs = path.join(SCRATCH2, "fx_arr_flip");
  mkdirSync(flipAbs, { recursive: true });
  writeFileSync(path.join(flipAbs, "d.txt"), "D1", "utf-8");
  const o2 = await f.t.execute({ mode: "COPY", srcFile: path.join(flipAbs, "d.txt"), startMarker: "D1", endMarker: "D1" }, {});
  chk("(B4) LAST MATCH WINS: allow THEN deny for the SAME resource -> NOT a root",
    o2.output === denyLine(path.join(flipAbs, "d.txt"), f.root, [path.resolve(FX + "/fx_arr_allowed"), path.resolve(FX + "/fx_arr_twice")]), o2.output);
  const twiceAbs = path.join(SCRATCH2, "fx_arr_twice");
  mkdirSync(twiceAbs, { recursive: true });
  writeFileSync(path.join(twiceAbs, "l.txt"), "L1", "utf-8");
  const o3 = await f.t.execute({ mode: "COPY", srcFile: path.join(twiceAbs, "l.txt"), startMarker: "L1", endMarker: "L1" }, {});
  chk("(B5) duplicate array allow entries -> ONE root, ALLOWS",
    (o3.output ?? "").startsWith("Copied 1 line"), o3.output);
  const rl = rootsOf(o2.output) ?? [];
  chk("(B6) the deny line's array roots ONCE EACH (allowed_r, twice_r), in config order; the DENIED flip_r absent; cwd+TEMP present",
    rl.length === expectedRoots(f.root, [path.resolve(FX + "/fx_arr_allowed"), path.resolve(FX + "/fx_arr_twice")]).length
    && rl.filter((s) => s.toLowerCase() === path.resolve(FX + "/fx_arr_allowed").toLowerCase()).length === 1
    && !rl.some((s) => s.toLowerCase().includes("flip_r")), JSON.stringify(rl));
  f.clean();
}

{
  // B7: malformed config -> EMPTY set fail-open (fixture repo outside the scratchpad subtree).
  const f = await loadFixture("bad", `{ "permission": { broken json <<<`);
  const okAbs = path.join(f.root, "sub");
  mkdirSync(okAbs, { recursive: true });
  writeFileSync(path.join(okAbs, "ok.txt"), "OK1\nOK2", "utf-8");
  const o = await f.t.execute({ mode: "COPY", srcFile: path.join(okAbs, "ok.txt"), startMarker: "OK1", endMarker: "OK2" }, {});
  chk("(B7a) CWD root still ALLOWED under a malformed config",
    (o.output ?? "").includes("Copied 2 lines"), o.output);
  const o2 = await f.t.execute({ mode: "COPY", srcFile: path.join(SCRATCH, "cfg_allowed.txt"), startMarker: "CFG1", endMarker: "CFG2" }, {});
  chk("(B7b) the scratchpad (a REAL-config root) is NOT a fixture root -> DENIED (EMPTY set fail-open, NEVER 'everything allowed')",
    o2.output === denyLine(path.join(SCRATCH, "cfg_allowed.txt"), f.root, []), o2.output);
  const o3 = await f.t.execute({ mode: "COPY", srcFile: path.join(tempRoot, "tmp_allowed.txt"), startMarker: "TMP1", endMarker: "TMP2" }, {});
  chk("(B7c) the temp roots survive the fail-open",
    (o3.output ?? "").includes("Copied 2 lines"), o3.output);
  f.clean();
}

// ------------------------------------------------------------------ teardown + env restore

cleanup();
chk("(T1) teardown disposes the registration (exactly ONE dispose)", DISPOSED === 1, `DISPOSED=${DISPOSED}`);
restore();
chk("(T2) TEMP/TMP env restored to the ambient values",
  (process.env.TEMP ?? undefined) === ambientTEMP && (process.env.TMP ?? undefined) === ambientTMP);

console.log(`SMOKE: ${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
