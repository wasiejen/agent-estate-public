// block_transfer.sandbox.smoke.mjs — the block_transfer sandbox guard +
// description rewrite (scratchpad origin: bt_sandbox_smoke.mjs, iter-10 T1
// verification; moved per the 2026-09-15_smoke-harness-home proposal).
// The REJECT fixtures aim at paths OUTSIDE the sandbox — computed from the
// repo root (parent dir + a Windows system file); none of them is ever
// written (the guard must fire first; the smoke asserts that).
// Run: node .opencode/plugin/tests/block_transfer.sandbox.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { REPO_ROOT, SCRATCHPAD, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const workDir = freshSandbox("block_transfer_sandbox");
const tempRoot = process.env.TEMP || process.env.TMP;
const tempFile = path.join(tempRoot, "bt_sandbox_tmp.txt");
const tempFile2 = path.join(tempRoot, "bt_sandbox_tmp2.txt");
const tempSubFile = path.join(tempRoot, "bt_sandbox_tmpsub", "f.txt");
const outsideDir = path.dirname(REPO_ROOT); // parent of the repo root (outside the sandbox when cwd = repo root)
const outsideDst1 = path.join(outsideDir, "smoke_outside_paste.txt");
const outsideDst2 = path.join(outsideDir, "smoke_outside_move.txt");
const outsideDstRel = path.join(outsideDir, "smoke_outside_rel.txt");
const outsideDstRep = path.join(outsideDir, "smoke_outside_replace.txt");
const outsideAbs = "C:\\Windows\\System32\\drivers\\etc\\hosts"; // existing file OUTSIDE both allowed roots (reject fixture)

const { chk, finish } = makeChecker("BT-SANDBOX-SMOKE");

// ---- setup: clean slate
for (const p of [tempFile, tempFile2, path.join(tempRoot, "bt_sandbox_tmpsub"), outsideDst1, outsideDst2, outsideDstRel, outsideDstRep]) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
}
fs.mkdirSync(path.join(workDir, "sub"), { recursive: true });
const write = (rel, content) => fs.writeFileSync(path.join(workDir, rel), content, "utf-8");
const readW = (rel) => fs.readFileSync(path.join(workDir, rel), "utf-8");
write("a_cwd.txt", "AAA start\nline1\nline2\nZZZ end\ntail");
write("sub/in.txt", "BBB start\nx1\nx2\nYYY end");

const mod = await loadRepo(".opencode/tools/block_transfer.ts");
const t = mod.default;
const ctx = { directory: workDir };   // working dir = scratchpad subdir (allowed root 1)
const ctxRepo = { directory: REPO_ROOT };  // working dir = repo root (allowed root 1 for reject matrix)

// ===== Test-side mirror of the tool's CONFIG_ROOTS loader (TODO #140 unit
// A, 2026-10-22) =====
// Used ONLY to compute the EXPECTED roots list for the byte-exact sandbox
// error re-pins. The repo-loaded instance above read the repo's OWN
// opencode.jsonc at module load (that IS the config it runs against); the
// new item-1/3/4 pins below run COPIES of the tool under a FIXTURE config,
// NEVER this file. The rules mirrored: keys valued "allow", a trailing
// `/**` stripped (plain-dir twin dedupe), dedupe by the RESOLVED lower-cased
// form, final list [cwd, ...config..., TEMP ?? TMP, os.tmpdir()] deduped
// by EXACT string equality.
const stripJsonc = (text) => {
  let out = "";
  let i = 0;
  let inString = false;
  let escaped = false;
  while (i < text.length) {
    const c = text[i];
    if (inString) {
      out += c;
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      i++;
      continue;
    }
    if (c === '"') { inString = true; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
};
const stripTrailingCommas = (text) => {
  const chars = text.split("");
  const keep = new Array(chars.length).fill(true);
  let inString = false;
  let escaped = false;
  let lastComma = -1;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; lastComma = -1; continue; }
    if (c === ",") { lastComma = i; continue; }
    if (c === "}" || c === "]") {
      if (lastComma !== -1) keep[lastComma] = false;
      lastComma = -1;
      continue;
    }
    if (c.trim() !== "") lastComma = -1;
  }
  return chars.filter((c, i) => keep[i]).join("");
};
const cfgRootsFor = (cfgFile) => {
  try {
    const cfg = JSON.parse(stripTrailingCommas(stripJsonc(fs.readFileSync(cfgFile, "utf-8"))));
    const ext = cfg && typeof cfg === "object" && cfg.permission && typeof cfg.permission === "object"
      ? cfg.permission.external_directory
      : null;
    if (!ext || typeof ext !== "object") return [];
    const seen = new Set();
    const roots = [];
    for (const [key, val] of Object.entries(ext)) {
      if (val !== "allow" || key === "") continue;
      const root = path.resolve(key.endsWith("/**") ? key.slice(0, -3) : key);
      const n = root.toLowerCase();
      if (seen.has(n)) continue;
      seen.add(n);
      roots.push(root);
    }
    return roots;
  } catch {
    return []; // fail-open mirror: unreadable/malformed config -> no config roots
  }
};
const expectedSandboxRoots = (cwdRoot, cfgRoots) =>
  [cwdRoot, ...cfgRoots, process.env.TEMP ?? process.env.TMP, os.tmpdir()]
    .filter((x) => typeof x === "string" && x.length > 0)
    .filter((x, i, all) => all.indexOf(x) === i);
const liveCfgRoots = cfgRootsFor(path.join(REPO_ROOT, "opencode.jsonc"));

try {
  // ---- shape checks
  chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string");
  chk("no stale 'name'/'parameters' keys", t && !("name" in t) && !("parameters" in t));
  chk("execute is async fn", typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");

  // ---- description = agent-facing usage guide
  const d = t.description;
  // re-pinned per S4 (2026-09-25_block_transfer-v2): the final 11-mode set
  // (the description names every mode).
  for (const m of ["MOVE", "COPY", "APPEND", "CUT", "PASTE", "REPLACE", "WRITE", "PEEK", "MAP", "DELETE", "CLEAR"]) chk(`description names mode ${m}`, d.includes(m));
  chk("description: the PEEK boundary sentence (full content: PASTE it to a file and read)", d.includes("full content: PASTE it to a file and read."));
  chk("description: anchors span INCLUSIVE", d.includes("INCLUSIVE"));
  chk("description: targetMarker sets insertion, else append at EOF", d.includes("targetMarker") && /append at EOF/.test(d));
  chk("description: named buffers, default 'default', multiple per session", d.includes("bufferName") && d.includes("'default'") && /multiple buffers/i.test(d));
  chk("description: sandbox boundary covers reads AND writes (working dir + temp)", /reads AND writes/i.test(d) && /temp/i.test(d));
  chk("description: leads with the one-liner (housekeeping rule dropped per ff4c2fc)", d.includes("Move, copy, cut, paste, delete, or clear multi-line blocks in files using short unique line-prefix anchors and named clipboard buffers."));

  chk("description: sandbox paragraph names the config allow roots (TODO #140 unit A)", /opencode\.jsonc/.test(d) && /permission\.external_directory/.test(d));

  // ---- args shape
  const args = t.args;
  chk("mode is required (rejects undefined)", args.mode && !args.mode.safeParse(undefined).success);
  chk("mode accepts MOVE", args.mode.safeParse("MOVE").success);
  chk("mode accepts WRITE", args.mode.safeParse("WRITE").success);
  chk("mode accepts PEEK", args.mode.safeParse("PEEK").success);
  chk("mode rejects bogus value", !args.mode.safeParse("BOGUS").success);
  for (const k of ["srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "bufferName", "regions", "from", "count"]) {
    chk(`args.${k} is optional (accepts undefined)`, args[k] && args[k].safeParse(undefined).success);
  }

  // ---- sandbox ALLOW matrix (reads AND writes)
  let r;
  r = await t.execute({ mode: "COPY", srcFile: "a_cwd.txt", startMarker: "AAA", endMarker: "ZZZ", bufferName: "allow1" }, ctx);
  chk("ALLOW read: file in cwd (COPY)", /Copied 4 lines/.test(r) && readW("a_cwd.txt") === "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "PASTE", dstFile: "a_cwd.txt", bufferName: "allow1", targetMarker: "tail" }, ctx);
  chk("ALLOW write: file in cwd (PASTE)", /Pasted 4 lines/.test(r) && readW("a_cwd.txt") === "AAA start\nline1\nline2\nZZZ end\ntail\nAAA start\nline1\nline2\nZZZ end");
  r = await t.execute({ mode: "COPY", srcFile: "sub/in.txt", startMarker: "BBB", endMarker: "YYY", bufferName: "allow2" }, ctx);
  chk("ALLOW read: file in cwd subdir (COPY)", /Copied 4 lines/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: "sub/deep/out.txt", bufferName: "allow2" }, ctx);
  chk("ALLOW write: NEW subdir inside sandbox (PASTE creates dir)", /Pasted 4 lines/.test(r) && fs.readFileSync(path.join(workDir, "sub/deep/out.txt"), "utf-8") === "BBB start\nx1\nx2\nYYY end");
  fs.writeFileSync(tempFile, "TTT start\nm1\nMMM end\nrest");
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "TTT", endMarker: "MMM", bufferName: "allow3" }, ctx);
  chk("ALLOW read: file in temp dir (COPY)", /Copied 3 lines/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile, bufferName: "allow3" }, ctx);
  chk("ALLOW write: file in temp dir (PASTE)", /Pasted 3 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "TTT start\nm1\nMMM end\nrest\nTTT start\nm1\nMMM end");
  fs.writeFileSync(tempFile, "SSS start\nn1\nNNN end\ntailx");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "SSS", endMarker: "NNN", dstFile: tempSubFile }, ctx);
  chk("ALLOW write: NEW temp subdir (MOVE creates dir)", /Moved 3 lines/.test(r) && fs.readFileSync(tempSubFile, "utf-8") === "SSS start\nn1\nNNN end" && fs.readFileSync(tempFile, "utf-8") === "tailx");

  // ---- functional round-trips, all six modes (allowed paths)
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  fs.writeFileSync(tempFile2, "head\nmarker-line\nfoot");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", dstFile: tempFile2, targetMarker: "marker-line" }, ctx);
  chk("MOVE round-trip (targetMarker)", /Moved 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail" && fs.readFileSync(tempFile2, "utf-8") === "head\nmarker-line\nAAA start\nline1\nline2\nZZZ end\nfoot");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  fs.writeFileSync(tempFile2, "head");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", dstFile: tempFile2 }, ctx);
  chk("MOVE round-trip (append EOF)", /Moved 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail" && fs.readFileSync(tempFile2, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_copy" }, ctx);
  chk("COPY round-trip (src untouched, buffer filled)", /Copied 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "CUT", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_cut" }, ctx);
  chk("CUT round-trip (src cut, buffer filled)", /Cut 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail");
  fs.writeFileSync(tempFile2, "head\nmarker-line\nfoot");
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_copy", targetMarker: "marker-line" }, ctx);
  chk("PASTE round-trip (targetMarker)", /Pasted 4 lines/.test(r) && fs.readFileSync(tempFile2, "utf-8") === "head\nmarker-line\nAAA start\nline1\nline2\nZZZ end\nfoot");
  fs.writeFileSync(tempFile2, "head");
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_cut" }, ctx);
  chk("PASTE round-trip (append EOF)", /Pasted 4 lines/.test(r) && fs.readFileSync(tempFile2, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "DELETE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ" }, ctx);
  chk("DELETE round-trip (block purged)", /Deleted 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail");
  fs.writeFileSync(tempFile, "AAA start\nZZZ end");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_clear" }, ctx);
  r = await t.execute({ mode: "CLEAR", bufferName: "rt_clear" }, ctx);
  chk("CLEAR reports buffer cleared (Part F shape — re-pinned per S3)", /Cleared buffer/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_clear" }, ctx);
  chk("PASTE from cleared buffer -> empty-buffer error", /is empty/.test(r));

  // ---- buffer isolation (two names, no cross-talk)
  fs.writeFileSync(tempFile, "AAA one\nZZZ one");
  fs.writeFileSync(tempFile2, "BBB two\nYYY two");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "iso_a" }, ctx);
  await t.execute({ mode: "COPY", srcFile: tempFile2, startMarker: "BBB", endMarker: "YYY", bufferName: "iso_b" }, ctx);
  fs.writeFileSync(tempFile2, "head");
  await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "iso_a" }, ctx);
  await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "iso_b" }, ctx);
  chk("buffer isolation (two names, no cross-talk)", fs.readFileSync(tempFile2, "utf-8") === "head\nAAA one\nZZZ one\nBBB two\nYYY two" && fs.readFileSync(tempFile, "utf-8") === "AAA one\nZZZ one");

  // ---- error paths (allowed paths)
  r = await t.execute({ mode: "COPY", srcFile: "no_such_file.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctx);
  chk("error: missing src file (guard passes, not-found)", /not found/.test(r) && !/outside the sandbox/.test(r));
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "NOPE", endMarker: "ZZZ" }, ctx);
  chk("error: missing start marker", /Start marker 'NOPE' not found/.test(r));
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "MISSING" }, ctx);
  // re-pinned per Part A (2026-09-25_block_transfer-v2): the end marker now
  // resolves file-wide through resolveAnchor — the teaching not-found error
  // carries the file (the old "after start marker" wording is gone for the
  // true not-found case; the semantic — end marker not found — is kept).
  chk("error: missing end marker", /End marker 'MISSING' not found in/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "never_used" }, ctx);
  chk("error: PASTE from never-used empty buffer", /is empty/.test(r));

  // ---- sandbox REJECT matrix (cwd = repo root; temp root still allowed)
  const REJ = /outside the sandbox/;
  // fill a buffer for the PASTE-reject cases (COPY from an allowed temp file)
  fs.writeFileSync(tempFile, "RRR start\nzz1\nZZZ end");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "RRR", endMarker: "ZZZ", bufferName: "rej_buf" }, ctxRepo);
  r = await t.execute({ mode: "COPY", srcFile: "..\\definitely_outside.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: '..' traversal out of cwd", REJ.test(r));
  r = await t.execute({ mode: "COPY", srcFile: outsideAbs, startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: absolute C:\\Windows path (guard fires before read of an EXISTING file)", REJ.test(r) && !/marker.*not found/i.test(r));
  r = await t.execute({ mode: "COPY", srcFile: path.join(outsideDir, "sibling_probe.txt"), startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: sibling dir of repo root", REJ.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: outsideDst1, bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: PASTE into outside (absolute)", REJ.test(r) && !fs.existsSync(outsideDst1));
  r = await t.execute({ mode: "PASTE", dstFile: "..\\smoke_outside_rel.txt", bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: PASTE into '..' (relative)", REJ.test(r) && !fs.existsSync(outsideDstRel));
  const moveSrcBefore = fs.readFileSync(tempFile, "utf-8");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "RRR", endMarker: "ZZZ", dstFile: outsideDst2 }, ctxRepo);
  chk("REJECT MOVE: dst outside (no partial cut: src unchanged, dst not created)", REJ.test(r) && fs.readFileSync(tempFile, "utf-8") === moveSrcBefore && !fs.existsSync(outsideDst2));
  r = await t.execute({ mode: "DELETE", srcFile: outsideAbs, startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT DELETE: src outside", REJ.test(r));
  // TODO #94: REPLACE into an outside dst — the guard fires BEFORE any fs access
  // (no read, no write, no file created); the buffer stays untouched for later use.
  // re-pinned 2026-10-22 (TODO #140 unit A): the allowed set gains the
  // config roots of the repo's own opencode.jsonc (the loaded instance read
  // them at tool load) — the expected list mirrors the tool's loader.
  const repRoots = expectedSandboxRoots(REPO_ROOT, liveCfgRoots);
  r = await t.execute({ mode: "REPLACE", dstFile: outsideDstRep, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: REPLACE into outside (byte-exact error form, no write)", r === `Error: '${outsideDstRep}' is outside the sandbox (allowed: ${repRoots.join(", ")})` && !fs.existsSync(outsideDstRep));
  chk("reject error form: Error: '<path>' is outside the sandbox (allowed: <roots>)", /^Error: '.*' is outside the sandbox \(allowed: [^)]+\)$/.test(r));

  // ===== CONFIG-DRIVEN ALLOW ROOTS — FIXTURE CONFIG PINS (TODO #140 unit A:
  // items 1/3/4 + the isolation contrast for item 2) =====
  // The scratchpad sandbox fixture WRITES a TEST config file (NEVER the
  // live opencode.jsonc): a COPY of the tool module sits under
  // fx_*/.opencode/tools/, so the tool resolves ITS OWN repo root = the
  // fixture root and reads fx_*/opencode.jsonc at load. The module's
  // "@opencode-ai/plugin" import is satisfied by a node_modules mirror under
  // cfgmod (the real package = identity tool() + zod; zod is copied from
  // the repo's .opencode/node_modules/zod).
  // ISOLATION: TEMP/TMP are pointed at cfgmod/workdir for the whole
  // section (sandboxCheck reads the env override at CALL time and os.tmpdir()
  // follows it — measured) — the REAL temp root is therefore NOT allowed
  // for the fixture instances, so a success under the fixture config's
  // allow root (a sibling of the fixture cwd, OUTSIDE cwd + temp-override
  // + deny roots) ISOLATES the config root as the reason. The env is
  // restored in the section's own finally.
  const cfgmod = path.join(workDir, "cfgmod");
  const fxOk = path.join(cfgmod, "fx_ok");
  const fxBad = path.join(cfgmod, "fx_bad");
  const fxWork = path.join(cfgmod, "workdir");
  const fxAllowed = path.join(cfgmod, "allowed_root");
  const fxDenied = path.join(cfgmod, "denied_root");
  const fxGHOST = "C:/definitely/not/exists/bt_cfg_ghost";
  const savedTEMP = process.env.TEMP;
  const savedTMP = process.env.TMP;
  const realTemp = savedTEMP ?? savedTMP;
  const liveRootOutside = liveCfgRoots.find((rr) => !rr.toLowerCase().startsWith(realTemp.toLowerCase()) && rr !== REPO_ROOT);
  fs.mkdirSync(fxWork, { recursive: true });
  fs.mkdirSync(fxAllowed, { recursive: true });
  fs.mkdirSync(fxDenied, { recursive: true });
  fs.mkdirSync(path.join(cfgmod, "node_modules", "@opencode-ai", "plugin"), { recursive: true });
  fs.writeFileSync(path.join(cfgmod, "node_modules", "@opencode-ai", "plugin", "package.json"), JSON.stringify({ name: "@opencode-ai/plugin", type: "module" }));
  // the real @opencode-ai/plugin dist/tool.js shape (identity + zod schema)
  fs.writeFileSync(path.join(cfgmod, "node_modules", "@opencode-ai", "plugin", "index.js"), 'import { z } from "zod";\nexport function tool(input) { return input; }\ntool.schema = z;\n');
  fs.cpSync(path.join(REPO_ROOT, ".opencode", "node_modules", "zod"), path.join(cfgmod, "node_modules", "zod"), { recursive: true });
  const btToolSrc = fs.readFileSync(path.join(REPO_ROOT, ".opencode", "tools", "block_transfer.ts"), "utf-8");
  const mkFxTool = (fxDir) => {
    fs.mkdirSync(path.join(fxDir, ".opencode", "tools"), { recursive: true });
    fs.writeFileSync(path.join(fxDir, ".opencode", "tools", "block_transfer.ts"), btToolSrc);
  };
  mkFxTool(fxOk);
  // the fixture config: the allow twin pair (plain dir + "/**"), a "deny"
  // -valued key, and a nonexistent allow dir; JSONC comments + a "//" inside
  // a string value exercise the comment stripper.
  fs.writeFileSync(path.join(fxOk, "opencode.jsonc"), [
    "{",
    "  // fixture config - this file, NEVER the live opencode.jsonc",
    '  "note": "https://example.com/not/a//comment",',
    '  "permission": {',
    '    "external_directory": {',
    `      ${JSON.stringify(fxAllowed)}: "allow",`,
    `      ${JSON.stringify(fxAllowed + "/**")}: "allow",`,
    `      ${JSON.stringify(fxDenied)}: "deny",`,
    `      ${JSON.stringify(fxGHOST)}: "allow"`,
    "    }",
    "  }",
    "}",
  ].join("\n"));
  mkFxTool(fxBad);
  // fx_bad: MALFORMED config (item 3) - fail-open must not throw at load
  fs.writeFileSync(path.join(fxBad, "opencode.jsonc"), '{"permission": {{"broken jsonc');
  process.env.TEMP = fxWork;
  process.env.TMP = fxWork;
  const ctxFx = { directory: fxWork };
  try {
    const ft = (await import(pathToFileURL(path.join(fxOk, ".opencode", "tools", "block_transfer.ts")).href)).default;
    const fxOkCfgRoots = cfgRootsFor(path.join(fxOk, "opencode.jsonc"));
    // ---- item 1: ONE pin PER TOOL MODE THAT CHECKS A ROOT (COPY/MOVE/PASTE/
    // REPLACE/WRITE under the fixture config's allow root; every path is
    // RELATIVE from the fixture cwd and crosses OUTSIDE it - allowed ONLY
    // by the config root now that temp-override excludes the real temp)
    fs.writeFileSync(path.join(fxAllowed, "src_a.txt"), "AAA start\nx1\nZZZ end\ntail");
    r = await ft.execute({ mode: "COPY", srcFile: "../allowed_root/src_a.txt", startMarker: "AAA", endMarker: "ZZZ", bufferName: "fx1" }, ctxFx);
    chk("item 1 - ALLOW cfg root (COPY read): ../allowed_root outside cwd+temp-override, inside the fixture config root", /Copied 3 lines/.test(r) && fs.readFileSync(path.join(fxAllowed, "src_a.txt"), "utf-8") === "AAA start\nx1\nZZZ end\ntail");
    fs.writeFileSync(path.join(fxAllowed, "mv_src.txt"), "AAA m1\nZZZ m2");
    fs.writeFileSync(path.join(fxAllowed, "mv_dst.txt"), "head");
    r = await ft.execute({ mode: "MOVE", srcFile: "../allowed_root/mv_src.txt", startMarker: "AAA", endMarker: "ZZZ", dstFile: "../allowed_root/mv_dst.txt" }, ctxFx);
    chk("item 1 - ALLOW cfg root (MOVE): src+dst both under the config root", /Moved 2 lines/.test(r) && fs.readFileSync(path.join(fxAllowed, "mv_dst.txt"), "utf-8") === "head\nAAA m1\nZZZ m2" && fs.readFileSync(path.join(fxAllowed, "mv_src.txt"), "utf-8") === "");
    r = await ft.execute({ mode: "PASTE", dstFile: "../allowed_root/paste_dst.txt", bufferName: "fx1" }, ctxFx);
    chk("item 1 - ALLOW cfg root (PASTE new file under the config root)", /Pasted 3 lines/.test(r) && fs.readFileSync(path.join(fxAllowed, "paste_dst.txt"), "utf-8") === "AAA start\nx1\nZZZ end");
    fs.writeFileSync(path.join(fxAllowed, "rep.txt"), "head\nREP-A old\ntail");
    r = await ft.execute({ mode: "REPLACE", dstFile: "../allowed_root/rep.txt", startMarker: "REP-A", endMarker: "REP-A", bufferName: "fx1" }, ctxFx);
    chk("item 1 - ALLOW cfg root (REPLACE in place under the config root)", /Replaced 1 line/.test(r) && fs.readFileSync(path.join(fxAllowed, "rep.txt"), "utf-8") === "head\nAAA start\nx1\nZZZ end\ntail");
    fs.writeFileSync(path.join(fxAllowed, "wr.txt"), "w1\nWR-A old\nw2");
    r = await ft.execute({ mode: "WRITE", dstFile: "../allowed_root/wr.txt", startMarker: "WR-A", endMarker: "WR-A", text: "NEW line" }, ctxFx);
    chk("item 1 - ALLOW cfg root (WRITE text form under the config root, no sandbox error)", fs.readFileSync(path.join(fxAllowed, "wr.txt"), "utf-8") === "w1\nNEW line\nw2" && !/outside the sandbox/.test(r));
    // ---- item 4: the `/**` twin + plain-dir pair DEDUPE to ONE root in the
    // allowed list (fixture-context byte-exact reject + count pins)
    const expFxRoots = expectedSandboxRoots(fxWork, fxOkCfgRoots);
    r = await ft.execute({ mode: "COPY", srcFile: "../nowhere/x.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctxFx);
    chk("fixture REJECT (outside every allowed root): byte-exact teaching error with the FIXTURE roots list", r === `Error: '../nowhere/x.txt' is outside the sandbox (allowed: ${expFxRoots.join(", ")})`);
    chk("item 4 - twin dedupe: allowed_root appears EXACTLY ONCE in the allowed list despite BOTH keys", r.split(fxAllowed).length - 1 === 1 && expFxRoots.filter((rr) => rr === fxAllowed).length === 1);
    chk("deny-valued key EXCLUDED: denied_root absent from the allowed list", !r.includes(fxDenied));
    // ---- isolation (item 2 contrast): a path under a LIVE-config allow root
    // (a real repo the live opencode.jsonc allows - e.g. the clone root) is
    // REJECTED by the FIXTURE instance -> proof the fixture never read the
    // live config; the file is NEVER created (guard fires before fs access).
    const liveProbe = path.join(liveRootOutside, "bt_smoke_never_written.txt");
    r = await ft.execute({ mode: "COPY", srcFile: liveProbe, startMarker: "AAA", endMarker: "ZZZ" }, ctxFx);
    chk("fixture isolation: a LIVE-config allow root is NOT in the fixture allowed set (rejected, file absent)", /outside the sandbox/.test(r) && !fs.existsSync(liveProbe));
    // ---- item 3: MALFORMED config -> fail-open to the SMALLER set
    // ([cwd + temp] only - never fail-closed to everything allowed)
    const ftBad = (await import(pathToFileURL(path.join(fxBad, ".opencode", "tools", "block_transfer.ts")).href)).default;
    fs.writeFileSync(path.join(fxWork, "bad_ok.txt"), "BBB start\nq1\nQQQ end");
    r = await ftBad.execute({ mode: "COPY", srcFile: "bad_ok.txt", startMarker: "BBB", endMarker: "QQQ", bufferName: "bad1" }, ctxFx);
    chk("item 3 - malformed config: tool still WORKS (load did not throw; cwd COPY succeeds)", /Copied 3 lines/.test(r));
    r = await ftBad.execute({ mode: "COPY", srcFile: "../allowed_root/src_a.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctxFx);
    chk("item 3 - malformed config: NO config roots - the allow root is REJECTED (byte-exact single-root list)", r === `Error: '../allowed_root/src_a.txt' is outside the sandbox (allowed: ${expectedSandboxRoots(fxWork, []).join(", ")})` && expFxRoots.join(",").indexOf(fxAllowed) >= 0);
  } finally {
    // restore the TEMP/TMP override + drop the fixture module tree
    if (savedTEMP === undefined) delete process.env.TEMP; else process.env.TEMP = savedTEMP;
    if (savedTMP === undefined) delete process.env.TMP; else process.env.TMP = savedTMP;
    try { fs.rmSync(cfgmod, { recursive: true, force: true }); } catch {}
  }
} finally {
  for (const p of [workDir, tempFile, tempFile2, path.join(tempRoot, "bt_sandbox_tmpsub"), outsideDst1, outsideDst2, outsideDstRel, outsideDstRep]) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
  }
}

finish();
