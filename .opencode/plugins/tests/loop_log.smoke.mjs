// loop_log.smoke.mjs — TODO #137 unit 5a: the v2 loop_log plugin smoke.
// bun, MOCK ctx — no opencode process, NEVER the live loop folder. Pins the DoD
// 1-2 contract of `.opencode/plugins/loop_log.ts`: the loader shape {id, setup}
// + the `tool.transform`/`editor.add` registration (plain JSON-schema input
// with required status/content, string output promise execute, teardown disposes
// the registration), the status token table (one case per keyword, `restart`
// -> START, case/dash normalization), the unrecognized/EMPTY-status Error string
// with ZERO writes (no folder, no append), the folder create/locate rules with
// the (created)/(existing) flags and the SEVERAL-folders ANOMALY note, the line
// format `<stamp> <status> <role> <session> <model> <content>`, the readback
// readback-match / readback-MISMATCH confirmation, the `corrects:` line (omitted
// for an empty log), and the Part A auto-fill chains on the v2 carrier (args
// beat context; context.sessionID/context.agent fill; the `unknown` fallbacks).
//
// Fixtures live in home/AppData/Local/Temp/opencode/
// small-write-tools-smoke-v2/looplog (recreated every run) — the LIVE loop
// folder and the LIVE DB are NEVER touched.
// Run: bun run loop_log.smoke.mjs (this dir). Expected final line:
// `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/small-write-tools-smoke-v2";
const ROOT = path.join(SCRATCH, "looplog"); // this smoke's fixture root
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "loop_log.ts");

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

// Minute-boundary-safe stamps: build the tool's stamp form locally and accept
// the value computed just before OR just after the call (the v1 smoke's
// pattern).
function stampOf(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}
function lineWith(d, status, role, session, model, content) {
  return `${stampOf(d)} ${status} ${role} ${session} ${model} ${content}`;
}
function okLine(got, status, role, session, model, content, tA, tB) {
  return got === lineWith(tA, status, role, session, model, content) || got === lineWith(tB, status, role, session, model, content);
}

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });

const TOOLS = [];
const HOOKCALLS = [];
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
        HOOKCALLS.push(name);
        return { dispose: async () => {} };
      },
    },
  };
}

const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;

// ------------------------------------------------------------------ S0/S1 the loader shape

chk("S0 default export is the loader shape { id: 'loop_log', setup }",
  plugin && typeof plugin === "object" && plugin.id === "loop_log" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const WS = path.join(ROOT, "ws"); // the mock workspace (ctx.location.directory)
mkdirSync(WS, { recursive: true });
const cleanup = await plugin.setup(makeCtx(WS));
chk("S1 setup registers the tool transform (name 'loop_log') and returns a teardown; NO hooks",
  TOOLS.length === 1 && TOOLS[0].name === "loop_log" && typeof cleanup === "function" && HOOKCALLS.length === 0,
  `tools=${TOOLS.length} cleanup=${typeof cleanup} hooks=${HOOKCALLS.length}`);

const TOOL = TOOLS[0];
chk("S1 the tool surface: plain JSON-schema input (required status,content; optional role/model/session), string output, promise execute",
  TOOL.input?.type === "object" &&
    TOOL.input.required?.join(",") === "status,content" &&
    Object.keys(TOOL.input.properties).sort().join(",") === "content,model,role,session,status" &&
    TOOL.output?.type === "string" &&
    typeof TOOL.execute === "function" && typeof TOOL.description === "string" && TOOL.description.length > 0,
  JSON.stringify([TOOL.input?.required, TOOL.input ? Object.keys(TOOL.input.properties) : null]));

const call = (args, toolCtx = {}) => TOOL.execute(args, toolCtx);
const outOf = async (args, toolCtx = {}) => String((await call(args, toolCtx)).output);

// ------------------------------------------------------------------ A fresh ws: folder create

{
  const tA = new Date();
  const out = await outOf({ status: "start", content: "task oneliner A" }, {});
  const tB = new Date();
  const lines = out.split("\n");
  const loopRoot = path.join(WS, "loop");
  const folders = existsSync(loopRoot) ? readdirSync(loopRoot) : [];
  chk("(A) exactly one autorun-* folder, name form autorun-<date>_<HH-MM>",
    folders.length === 1 && /^autorun-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(folders[0]), JSON.stringify(folders));
  chk("(A) return is exactly folder/line/verified (3 lines, no ANOMALY), folder flagged (created)",
    lines.length === 3 && lines[0] === `folder: ${folders[0]} (created)` && lines[1].startsWith("line: ") && lines[2].startsWith("verified: "), JSON.stringify(lines));
  chk("(A) verified: readback-match", lines[2] === "verified: readback-match", lines[2]);
  const logPath = path.join(loopRoot, folders[0], "loop_log.md");
  const fileLines = readFileSync(logPath, "utf-8").split("\n").filter((l) => l !== "");
  const got = lines[1].slice("line: ".length);
  chk("(A) the line: <stamp> -->START unknown unknown unknown <content> (all-unknown fallback, no context fields)",
    okLine(got, "-->START", "unknown", "unknown", "unknown", "task oneliner A", tA, tB), `got=${got}`);
  chk("(A) loop_log.md holds EXACTLY the written line (byte-exact)",
    fileLines.length === 1 && fileLines[0] === got, JSON.stringify(fileLines));
}

// ------------------------------------------------------------------ B same folder reused + context fill

{
  const tA = new Date();
  const out = await outOf({ status: "DONE", content: "gauge readout B" }, { sessionID: "ses_b", agent: "worker_FlashNext" });
  const tB = new Date();
  const lines = out.split("\n");
  const folder = readdirSync(path.join(WS, "loop"))[0];
  const fileLines = readFileSync(path.join(WS, "loop", folder, "loop_log.md"), "utf-8").split("\n").filter((l) => l !== "");
  chk("(B) the same folder is reused, flagged (existing); still 3 lines",
    lines.length === 3 && lines[0] === `folder: ${folder} (existing)`, JSON.stringify(lines));
  chk("(B) auto-fill: context.agent fills role AND model (the identifier preference), context.sessionID fills session",
    okLine(lines[1].slice(6), "DONE<---", "worker_FlashNext", "ses_b", "worker_FlashNext", "gauge readout B", tA, tB), `got=${lines[1]}`);
  chk("(B) append-only: both lines present, earlier line byte-unchanged",
    fileLines.length === 2 && fileLines[1] === lines[1].slice(6), JSON.stringify(fileLines));
  chk("(B) verified: readback-match", lines[2] === "verified: readback-match", lines[2]);
}

// ------------------------------------------------------------------ C token table: one case per keyword

{
  const cases = [
    ["done now", "DONE<---"],
    ["returned home", "-RETURN-"],
    ["Warning!", "-WARNING"],
    ["INFO--", "--INFO--"],
    ["restart", "-->START"], // the intended restart -> START normalization
    ["Corrected line", "CORRECT-"], // gains the corrects: line -> 4 return lines
  ];
  const folder = readdirSync(path.join(WS, "loop"))[0];
  const logPath = path.join(WS, "loop", folder, "loop_log.md");
  const gotTokens = [];
  let shapeOk = true;
  for (const [raw, token] of cases) {
    const out = await outOf({ status: raw, content: "tok probe" }, {});
    const lines = out.split("\n");
    const fileLines = readFileSync(logPath, "utf-8").split("\n").filter((l) => l !== "");
    const last = fileLines[fileLines.length - 1];
    const tok = last.split(" ")[1];
    const wantLines = token === "CORRECT-" ? 4 : 3;
    if (lines.length !== wantLines || tok !== token || !lines[1].endsWith(last.split(" ").slice(5).join(" "))) {
      // the return's `line:` must carry the same content field as the file line
      shapeOk = false;
      gotTokens.push(`${raw}->${tok}/${lines.length}`);
    } else {
      gotTokens.push(`${raw}->${tok}`);
    }
  }
  const expected = cases.map(([raw, token]) => `${raw}->${token}`).join(",");
  chk("(C) token table in keyword order done/return/warn/info/start/correct + 'restart' -> START (case/dash variants normalize)",
    shapeOk && gotTokens.join(",") === expected, JSON.stringify([gotTokens.join(","), expected]));
}

// ------------------------------------------------------------------ D bogus status: Error, ZERO writes

{
  const projD = path.join(ROOT, "wsD");
  mkdirSync(projD, { recursive: true });
  const cleanupD = await plugin.setup(makeCtx(projD));
  const e1 = await outOf({ status: "bogus", content: "x" }, {});
  const e2 = await outOf({ status: "", content: "x" }, {});
  chk("(D) bogus status: the v1 Error string (unrecognizable status \"bogus\" — accepted keywords ... nothing was written)",
    e1 === 'Error: unrecognizable status "bogus" — accepted keywords: start / done / return / warn / info / correct (no keyword matched; nothing was written).', JSON.stringify(e1));
  chk("(D) empty status: the same Error form (empty string, not a schema reject)",
    e2 === 'Error: unrecognizable status "" — accepted keywords: start / done / return / warn / info / correct (no keyword matched; nothing was written).', JSON.stringify(e2));
  chk("(D) bogus/empty write NOTHING: no loop folder created (fresh ws stays empty)",
    !existsSync(path.join(projD, "loop")) && readdirSync(projD).length === 0, JSON.stringify(readdirSync(projD)));
  cleanupD();
}

// ------------------------------------------------------------------ E anomaly: SEVERAL folders

{
  const projE = path.join(ROOT, "wsE");
  const loopE = path.join(projE, "loop");
  mkdirSync(path.join(loopE, "autorun-2026-01-01_00-01"), { recursive: true });
  mkdirSync(path.join(loopE, "autorun-2026-01-02_00-02"), { recursive: true });
  // Make the SECOND folder the most-recently-modified (write into it + bump mtime).
  writeFileSync(path.join(loopE, "autorun-2026-01-02_00-02", "seed.txt"), "seed\n", "utf-8");
  const later = new Date(Date.now() + 60000);
  utimesSync(path.join(loopE, "autorun-2026-01-02_00-02"), later, later);
  const cleanupE = await plugin.setup(makeCtx(projE));
  const out = await outOf({ status: "info", content: "anomaly probe" }, {});
  const lines = out.split("\n");
  chk("(E) SEVERAL folders: the most-recently-modified used, flagged (existing)",
    lines.length === 4 && lines[0] === "folder: autorun-2026-01-02_00-02 (existing)", JSON.stringify(lines));
  chk("(E) the ANOMALY note appended LAST (count + folder + the EXACTLY-ONE invariant text)",
    lines[3].startsWith("ANOMALY: 2 autorun-* folders exist in the loop dir; used the most-recently-modified (autorun-2026-01-02_00-02)") &&
      lines[3].includes("EXACTLY ONE current looprun folder"), JSON.stringify(lines[3]));
  chk("(E) verified: readback-match in the chosen folder", lines[2] === "verified: readback-match", lines[2]);
  chk("(E) the other folder untouched (no loop_log.md)",
    !existsSync(path.join(loopE, "autorun-2026-01-01_00-01", "loop_log.md")) &&
      existsSync(path.join(loopE, "autorun-2026-01-02_00-02", "loop_log.md")), "layout");
  cleanupE();
}

// ------------------------------------------------------------------ F CORRECT-: the corrects: line

{
  // fresh ws with 2 established lines, then a CORRECT- call
  const projF = path.join(ROOT, "wsF");
  const folderName = "autorun-2026-01-05_00-05";
  mkdirSync(path.join(projF, "loop", folderName), { recursive: true });
  writeFileSync(path.join(projF, "loop", folderName, "loop_log.md"),
    "2026-01-05_00-05 -->START planner_1 ses_prev planner_1 first line\n2026-01-05_00-06 --INFO-- planner_1 ses_prev planner_1 second line\n", "utf-8");
  const cleanupF = await plugin.setup(makeCtx(projF));
  const tA = new Date();
  const out = await outOf({ status: "corrected", content: "clarification" }, { sessionID: "ses_f", agent: "planner_9" });
  const tB = new Date();
  const lines = out.split("\n");
  chk("(F) CORRECT- return gains `corrects: <previous line>` byte-exact (the log's last line BEFORE the append)",
    lines.length === 4 && lines[3] === "corrects: 2026-01-05_00-06 --INFO-- planner_1 ses_prev planner_1 second line", JSON.stringify(lines[3]));
  const fileLines = readFileSync(path.join(projF, "loop", folderName, "loop_log.md"), "utf-8").split("\n").filter((l) => l !== "");
  chk("(F) the CORRECT- line appended: <stamp> CORRECT- planner_9 ses_f planner_9 <content>",
    okLine(fileLines[2], "CORRECT-", "planner_9", "ses_f", "planner_9", "clarification", tA, tB), `got=${fileLines[2]}`);
  cleanupF();
}
{
  // empty log -> the `corrects:` field omitted
  const projF2 = path.join(ROOT, "wsF2");
  const folderName = "autorun-2026-01-03_00-03";
  mkdirSync(path.join(projF2, "loop", folderName), { recursive: true });
  writeFileSync(path.join(projF2, "loop", folderName, "loop_log.md"), "", "utf-8");
  const cleanupF2 = await plugin.setup(makeCtx(projF2));
  const out = await outOf({ status: "correct", content: "first-ever line" }, {});
  const lines = out.split("\n");
  chk("(F2) an empty log omits the `corrects:` field (3 lines, folder flagged (existing))",
    lines.length === 3 && lines[0] === `folder: ${folderName} (existing)`, JSON.stringify(lines));
  cleanupF2();
}

// ------------------------------------------------------------------ G readback-MISMATCH form

{
  const projG = path.join(ROOT, "wsG");
  const folderName = "autorun-2026-01-04_00-04";
  mkdirSync(path.join(projG, "loop", folderName), { recursive: true });
  writeFileSync(path.join(projG, "loop", folderName, "loop_log.md"), "GLUED-PARTIAL", "utf-8"); // no trailing newline
  const cleanupG = await plugin.setup(makeCtx(projG));
  const out = await outOf({ status: "info", content: "appended" }, {});
  const lines = out.split("\n");
  chk("(G) pre-existing folder flagged (existing); the mismatch names the ACTUAL glued last line",
    lines.length === 3 && lines[0] === `folder: ${folderName} (existing)` && lines[2].startsWith("verified: readback-MISMATCH: GLUED-PARTIAL"), JSON.stringify(lines[2]));
  chk("(G) the file content is the glued partial + new line (append-only: nothing removed)",
    readFileSync(path.join(projG, "loop", folderName, "loop_log.md"), "utf-8").startsWith("GLUED-PARTIAL"), "content");
  cleanupG();
}

// ------------------------------------------------------------------ H auto-fill chains: args beat context, blanks fall through

{
  const projH = path.join(ROOT, "wsH");
  const cleanupH = await plugin.setup(makeCtx(projH));
  // H1: explicit args beat the context sources.
  const tA = new Date();
  const out1 = await outOf({ status: "start", content: "h1", role: "looprunner", model: "Qwen3.8-27B-Q3S-170K", session: "ses_arg" }, { sessionID: "ses_ctx", agent: "planner_1" });
  const tB = new Date();
  const folder = readdirSync(path.join(projH, "loop"))[0];
  const got1 = out1.split("\n")[1].slice(6);
  chk("(H1) explicit role/model/session args beat context.sessionID/context.agent",
    okLine(got1, "-->START", "looprunner", "ses_arg", "Qwen3.8-27B-Q3S-170K", "h1", tA, tB), `got=${got1}`);
  // H2: blank-string args fall through to the context.
  const tA2 = new Date();
  const out2 = await outOf({ status: "return", content: "h2", role: "  ", model: "", session: "" }, { sessionID: "ses_fill", agent: "worker_2" });
  const tB2 = new Date();
  const fileLines = readFileSync(path.join(projH, "loop", folder, "loop_log.md"), "utf-8").split("\n").filter((l) => l !== "");
  const got2 = fileLines[fileLines.length - 1];
  chk("(H2) blank-string args fall through to context.sessionID/context.agent",
    okLine(got2, "-RETURN-", "worker_2", "ses_fill", "worker_2", "h2", tA2, tB2), `got=${got2}`);
  // H3: empty ToolContext -> the literal `unknown` in all three slots.
  const got3 = (await outOf({ status: "warn", content: "h3" }, {})).split("\n")[1].slice(6);
  chk("(H3) empty context, no args: role/session/model all -> the literal 'unknown' (the v2 carrier has no sessionId/session.id/extra.model.id legs — the fallthrough carries)",
    got3.split(" ").slice(2, 5).join(",") === "unknown,unknown,unknown", `got=${got3}`);
  cleanupH();
}

// ------------------------------------------------------------------ I cleanup

{
  const dBefore = DISPOSED;
  cleanup();
  chk("(I) teardown disposes the registration (exactly ONE dispose per teardown call)",
    DISPOSED === dBefore + 1, `before=${dBefore} after=${DISPOSED}`);
}

console.log(`SMOKE: ${failures === 0 ? "ALL PASS" : failures + " FAILURE(S)"}`);
process.exit(failures === 0 ? 0 : 1);
