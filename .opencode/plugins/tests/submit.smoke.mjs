// submit.smoke.mjs — TODO #137 unit 5a: the v2 submit plugin smoke.
// bun, MOCK ctx — no opencode process, NEVER the live inbox trees. Pins the DoD
// 3 contract of `.opencode/plugins/submit.ts`: the loader shape {id, setup} +
// the `tool.transform`/`editor.add` registration (five optional string props,
// string output promise execute, teardown disposes the registration), the
// zero-param/empty-string error string with NO file touched, the channel map
// byte-identical to v1 (feedback -> agent/agent_feedback.md ###, knowledge
// -> agent/knowledge/knowledge_inbox.md ##, todo -> todo_inbox.md ## at the
// repo root, ideas -> agent/agent_ideas.md ###, memory -> agent/memory/<role>/
// memory_inbox.md ### with <role> = the agent id BEFORE the first '_'), the
// entry form `<header> <YYYY-MM-DD_HH-MM> <role> <session>` + raw text + one
// trailing blank line, the role/session auto-fill (context.agent else `agent`,
// context.sessionID else `unknown`), the return blocks `<param>`/`target:`/
// `entry:` in feedback/knowledge/todo/ideas/memory order sharing ONE stamp,
// append-only (sentinel stays byte-exact), and the 2026-10-21 NEWLINE GUARD
// (final-byte probe -> separator; a \n-terminated target gets none; a fresh
// file starts clean).
//
// Fixtures live in home/AppData/Local/Temp/opencode/
// small-write-tools-smoke-v2/submit (recreated every run) — the LIVE inbox
// trees and the LIVE DB are NEVER touched.
// Run: bun run submit.smoke.mjs (this dir). Expected final line:
// `SMOKE: ALL PASS`.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SCRATCH = "home/AppData/Local/Temp/opencode/small-write-tools-smoke-v2";
const ROOT = path.join(SCRATCH, "submit"); // this smoke's fixture root
const CLONE_ROOT = "repo-root-v2";
const PLUGIN = path.join(CLONE_ROOT, ".opencode", "plugins", "submit.ts");

let failures = 0;
function chk(label, ok, detail = "") {
  if (ok) console.log(`PASS  ${label}`);
  else {
    failures++;
    console.log(`FAIL  ${label}${detail ? "  [" + detail + "]" : ""}`);
  }
}

// Minute-boundary-safe stamps (the v1 smoke's pattern): accept the stamp
// computed just before OR just after the call.
function stampOf(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}
function entryWith(d, header, role, session, text) {
  return `${header} ${stampOf(d)} ${role} ${session}\n${text}\n\n`;
}
// body == the whole created file content == the entry (file created fresh)
function okFile(gotBody, header, role, session, text, tA, tB) {
  return gotBody === entryWith(tA, header, role, session, text) || gotBody === entryWith(tB, header, role, session, text);
}
function okRet(got, param, rel, header, role, session, text, tA, tB) {
  const head = `${param}\ntarget: ${rel}\nentry: `;
  return got === head + entryWith(tA, header, role, session, text) || got === head + entryWith(tB, header, role, session, text);
}

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });

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
      hook: async () => {
        throw new Error("submit plugin must not register hooks");
      },
    },
  };
}

const pluginMod = await import(pathToFileURL(PLUGIN).href);
const plugin = pluginMod.default;

// ------------------------------------------------------------------ S0/S1 the loader shape

chk("S0 default export is the loader shape { id: 'submit', setup }",
  plugin && typeof plugin === "object" && plugin.id === "submit" && typeof plugin.setup === "function",
  JSON.stringify(Object.keys(plugin ?? {})));

const WS = path.join(ROOT, "ws");
mkdirSync(WS, { recursive: true });
const cleanup = await plugin.setup(makeCtx(WS));
chk("S1 setup registers the tool transform (name 'submit') and returns a teardown",
  TOOLS.length === 1 && TOOLS[0].name === "submit" && typeof cleanup === "function",
  `tools=${TOOLS.length} cleanup=${typeof cleanup}`);

const TOOL = TOOLS[0];
chk("S1 the tool surface: plain JSON-schema input (FIVE optional string props, no required), string output, promise execute",
  TOOL.input?.type === "object" &&
    TOOL.input.required === undefined &&
    Object.keys(TOOL.input.properties).sort().join(",") === "feedback,ideas,knowledge,memory,todo" &&
    Object.values(TOOL.input.properties).every((p) => p.type === "string") &&
    TOOL.output?.type === "string" &&
    typeof TOOL.execute === "function" && TOOL.description.length > 500,
  JSON.stringify([TOOL.input?.required, TOOL.input ? Object.keys(TOOL.input.properties) : null]));

const call = (args, toolCtx = {}) => TOOL.execute(args, toolCtx);
const outOf = async (args, toolCtx = {}) => String((await call(args, toolCtx)).output);

// ------------------------------------------------------------------ A feedback + fallback stamp

{
  const projA = path.join(ROOT, "wsA");
  const cleanupA = await plugin.setup(makeCtx(projA));
  const tA = new Date();
  const ret = await outOf({ feedback: "friction A" }, {}); // NO agent/sessionID in ctx
  const tB = new Date();
  const f = path.join(projA, "agent", "agent_feedback.md");
  chk("(A) feedback -> agent/agent_feedback.md created with EXACTLY the entry (### stamp), fallback role `agent`/session `unknown`",
    existsSync(f) && okFile(readFileSync(f, "utf-8"), "###", "agent", "unknown", "friction A", tA, tB),
    JSON.stringify(readFileSync(f, "utf-8")));
  chk("(A) return = `feedback` + `target:` + `entry:` with entry byte-exact vs the file (minute-boundary-safe)",
    okRet(ret, "feedback", "agent/agent_feedback.md", "###", "agent", "unknown", "friction A", tA, tB), JSON.stringify(ret));
  chk("(A) no other target created (only agent/ under the ws)",
    readdirSync(projA).join(",") === "agent" && readdirSync(path.join(projA, "agent")).join(",") === "agent_feedback.md",
    JSON.stringify(readdirSync(projA)));
  cleanupA();
}

// ------------------------------------------------------------------ B/C knowledge + todo headers

{
  const projBC = path.join(ROOT, "wsBC");
  const cleanupBC = await plugin.setup(makeCtx(projBC));
  const tA = new Date();
  await call({ knowledge: "knowledge fact B" }, { agent: "worker_FlashNext", sessionID: "ses_b" });
  const tB = new Date();
  const kFile = path.join(projBC, "agent", "knowledge", "knowledge_inbox.md");
  chk("(B) knowledge -> agent/knowledge/knowledge_inbox.md (## header), explicit role/session in the stamp",
    okFile(readFileSync(kFile, "utf-8"), "##", "worker_FlashNext", "ses_b", "knowledge fact B", tA, tB), JSON.stringify(readFileSync(kFile, "utf-8")));

  const tC1 = new Date();
  await call({ todo: "loose finding C" }, { agent: "planner_7", sessionID: "ses_c" });
  const tC2 = new Date();
  const todoFile = path.join(projBC, "todo_inbox.md");
  chk("(C) todo -> todo_inbox.md AT the repo root (## header)",
    okFile(readFileSync(todoFile, "utf-8"), "##", "planner_7", "ses_c", "loose finding C", tC1, tC2), JSON.stringify(readFileSync(todoFile, "utf-8")));
  cleanupBC();
}

// ------------------------------------------------------------------ D none provided -> error, nothing touched

{
  const projD = path.join(ROOT, "wsD");
  mkdirSync(projD, { recursive: true });
  const cleanupD = await plugin.setup(makeCtx(projD));
  const retD = await outOf({}, {});
  chk("(D) none provided -> the exact v1 error string",
    retD === "error: none of feedback/knowledge/todo/ideas/memory provided — nothing written", JSON.stringify(retD));
  chk("(D) no file touched (the fresh ws stays empty)", readdirSync(projD).length === 0, JSON.stringify(readdirSync(projD)));
  const retD2 = await outOf({ feedback: "   ", todo: "", memory: "" }, {});
  chk("(D) empty/blank strings count as NOT provided -> the same error, still no file",
    retD2 === "error: none of feedback/knowledge/todo/ideas/memory provided — nothing written" && readdirSync(projD).length === 0,
    JSON.stringify([retD2, readdirSync(projD)]));
  cleanupD();
}

// ------------------------------------------------------------------ E all five channels at once

{
  const projE = path.join(ROOT, "wsE");
  const cleanupE = await plugin.setup(makeCtx(projE));
  const tA = new Date();
  const ret = await outOf(
    { feedback: "e fb", knowledge: "e kn", todo: "e todo", ideas: "e idea", memory: "e mem" },
    { agent: "worker_FlashNext", sessionID: "ses_e" },
  );
  const tB = new Date();
  const files = {
    fb: path.join(projE, "agent", "agent_feedback.md"),
    kn: path.join(projE, "agent", "knowledge", "knowledge_inbox.md"),
    todo: path.join(projE, "todo_inbox.md"),
    idea: path.join(projE, "agent", "agent_ideas.md"),
    mem: path.join(projE, "agent", "memory", "worker", "memory_inbox.md"),
  };
  const want = [
    ["feedback", "agent/agent_feedback.md", "###", "e fb"],
    ["knowledge", "agent/knowledge/knowledge_inbox.md", "##", "e kn"],
    ["todo", "todo_inbox.md", "##", "e todo"],
    ["ideas", "agent/agent_ideas.md", "###", "e idea"],
    ["memory", "agent/memory/worker/memory_inbox.md", "###", "e mem"],
  ];
  let filesOk = true;
  for (const [k, f] of Object.entries(files)) {
    if (!existsSync(f)) filesOk = false;
  }
  chk("(E) all five files created, memory role-scoped to agent/memory/worker/ (worker_FlashNext -> prefix `worker`)",
    filesOk, JSON.stringify(Object.entries(files).map(([k, f]) => [k, existsSync(f)])));
  let retOk = true;
  for (const [param, rel, header, text] of want) {
    if (!okRet2(ret, param, rel, header, "worker_FlashNext", "ses_e", text, tA, tB)) retOk = false;
  }
  chk("(E) return = the five blocks in feedback/knowledge/todo/ideas/memory order (byte-exact)",
    retOk, JSON.stringify(ret));
  const stamps = Object.values(files).map((f) => (readFileSync(f, "utf-8").match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}/) ?? [""])[0]);
  chk("(E) the five entries share ONE stamp (captured once per call)",
    stamps.every((s) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(s)) && new Set(stamps).size === 1, JSON.stringify(stamps));
  cleanupE();
}

// helper for block-in-multiblock matching (entries end blank; blocks join
// with ONE "\n", so between an entry and the next `<param>` block there are
// all the entry's trailing newlines plus the joiner)
function okRet2(ret, param, rel, header, role, session, text, tA, tB) {
  const marker = `${param}\ntarget: ${rel}\nentry: `;
  const idx = ret.indexOf(marker);
  if (idx === -1) return false;
  const after = ret.slice(idx + marker.length);
  for (const d of [tA, tB]) {
    const e = entryWith(d, header, role, session, text);
    if (after.startsWith(e)) {
      const rest = after.slice(e.length);
      if (rest === "" || /^\n*(feedback|knowledge|todo|ideas|memory)\n/.test(rest)) return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------ G ideas + maintainer untouched

{
  const projG = path.join(ROOT, "wsG");
  const cleanupG = await plugin.setup(makeCtx(projG));
  const tA = new Date();
  const ret = await outOf({ ideas: "process idea G" }, { agent: "looprunner", sessionID: "ses_g" });
  const tB = new Date();
  const gFile = path.join(projG, "agent", "agent_ideas.md");
  chk("(G) ideas -> agent_ideas.md created with EXACTLY the entry (### stamp)",
    okFile(readFileSync(gFile, "utf-8"), "###", "looprunner", "ses_g", "process idea G", tA, tB), JSON.stringify(readFileSync(gFile, "utf-8")));
  chk("(G) the maintainer-side ideas.md path is NOT touched (no maintainer/ under the ws)",
    !existsSync(path.join(projG, "maintainer")), "maintainer/ exists");
  chk("(G) return = `ideas` + `target:` + `entry:` byte-exact",
    okRet(ret, "ideas", "agent/agent_ideas.md", "###", "looprunner", "ses_g", "process idea G", tA, tB), JSON.stringify(ret));
  cleanupG();
}

// ------------------------------------------------------------------ H memory role-namespace forms

{
  const projH = path.join(ROOT, "wsH");
  const cleanupH = await plugin.setup(makeCtx(projH));
  const tH1 = new Date();
  const ret = await outOf({ memory: "planner lesson H" }, { agent: "planner_FlashNext", sessionID: "ses_h" });
  const tH2 = new Date();
  const memF = path.join(projH, "agent", "memory", "planner", "memory_inbox.md");
  chk("(H) memory -> agent/memory/planner/memory_inbox.md (folder + file auto-created), byte-exact entry, stamp role = FULL id",
    okFile(readFileSync(memF, "utf-8"), "###", "planner_FlashNext", "ses_h", "planner lesson H", tH1, tH2), JSON.stringify(readFileSync(memF, "utf-8")));
  chk("(H) return = `memory` + `target: agent/memory/planner/memory_inbox.md` + `entry:` byte-exact",
    okRet(ret, "memory", "agent/memory/planner/memory_inbox.md", "###", "planner_FlashNext", "ses_h", "planner lesson H", tH1, tH2), JSON.stringify(ret));
  chk("(H) no other channel target created",
    !existsSync(path.join(projH, "agent", "agent_feedback.md")) && !existsSync(path.join(projH, "todo_inbox.md")) &&
      readdirSync(path.join(projH, "agent", "memory")).join(",") === "planner", JSON.stringify(readdirSync(path.join(projH, "agent"))));
  cleanupH();

  const projH2 = path.join(ROOT, "wsH2");
  const cleanupH2 = await plugin.setup(makeCtx(projH2));
  const tA = new Date();
  await call({ memory: "worker lesson" }, { agent: "worker_Q3S_170K", sessionID: "ses_h2" });
  const tB = new Date();
  chk("(H2) `worker_Q3S_170K` -> prefix `worker` (agent/memory/worker/memory_inbox.md)",
    okFile(readFileSync(path.join(projH2, "agent", "memory", "worker", "memory_inbox.md"), "utf-8"), "###", "worker_Q3S_170K", "ses_h2", "worker lesson", tA, tB) &&
      !existsSync(path.join(projH2, "agent", "memory", "worker_Q3S_170K")), "wrong namespace");
  cleanupH2();

  const projH3 = path.join(ROOT, "wsH3");
  const cleanupH3 = await plugin.setup(makeCtx(projH3));
  const tA3 = new Date();
  await call({ memory: "no-agent lesson" }, {});
  const tB3 = new Date();
  chk("(H3) no agent in context -> prefix `agent` namespace (agent/memory/agent/memory_inbox.md), stamp role `agent`/session `unknown`",
    okFile(readFileSync(path.join(projH3, "agent", "memory", "agent", "memory_inbox.md"), "utf-8"), "###", "agent", "unknown", "no-agent lesson", tA3, tB3), JSON.stringify(readdirSync(path.join(projH3, "agent", "memory"))));
  cleanupH3();
}

// ------------------------------------------------------------------ F append-only: sentinel preserved

{
  const projF = path.join(ROOT, "wsF");
  mkdirSync(projF, { recursive: true });
  const fbF = path.join(projF, "agent", "agent_feedback.md");
  const knF = path.join(projF, "agent", "knowledge", "knowledge_inbox.md");
  const todoF = path.join(projF, "todo_inbox.md");
  mkdirSync(path.dirname(knF), { recursive: true });
  writeFileSync(fbF, "SENTINEL fb — must stay byte-identical.\n", "utf-8");
  writeFileSync(knF, "SENTINEL kn — must stay byte-identical.\n", "utf-8");
  writeFileSync(todoF, "SENTINEL todo — must stay byte-identical.\n", "utf-8");
  const cleanupF = await plugin.setup(makeCtx(projF));
  const tA = new Date();
  const ret = await outOf({ feedback: "appended fb" }, { agent: "worker_5", sessionID: "ses_f" });
  const tB = new Date();
  const fbBody = readFileSync(fbF, "utf-8");
  const entry = entryWith(tA, "###", "worker_5", "ses_f", "appended fb");
  const entryB = entryWith(tB, "###", "worker_5", "ses_f", "appended fb");
  chk("(F) pre-seeded sentinel stays byte-exact BEFORE the appended entry (append-only)",
    fbBody === "SENTINEL fb — must stay byte-identical.\n" + entry || fbBody === "SENTINEL fb — must stay byte-identical.\n" + entryB, JSON.stringify(fbBody));
  chk("(F) the other two targets are byte-identical (untouched)",
    readFileSync(knF, "utf-8") === "SENTINEL kn — must stay byte-identical.\n" && readFileSync(todoF, "utf-8") === "SENTINEL todo — must stay byte-identical.\n", "touched");
  chk("(F) return reflects ONLY the provided param (feedback block only, byte-exact)",
    ret === `feedback\ntarget: agent/agent_feedback.md\nentry: ${entry}` || ret === `feedback\ntarget: agent/agent_feedback.md\nentry: ${entryB}`, JSON.stringify(ret));
  cleanupF();
}

// ------------------------------------------------------------------ N the NEWLINE GUARD (2026-10-21 fix kept)

{
  const projN = path.join(ROOT, "wsN");
  const todoN = path.join(projN, "todo_inbox.md");
  mkdirSync(projN, { recursive: true });
  writeFileSync(todoN, "NO-TRAILING-NEWLINE", "utf-8"); // final byte != \n
  const cleanupN = await plugin.setup(makeCtx(projN));
  const tA = new Date();
  await call({ todo: "guard entry one" }, { agent: "planner_1", sessionID: "ses_n" });
  const tB = new Date();
  const body1 = readFileSync(todoN, "utf-8");
  const e1 = entryWith(tA, "##", "planner_1", "ses_n", "guard entry one");
  const e1b = entryWith(tB, "##", "planner_1", "ses_n", "guard entry one");
  chk("(N) target WITHOUT a trailing newline: a one-\\n separator lands, the HEADER starts a line (glued-entry bug fixed)",
    body1 === "NO-TRAILING-NEWLINE\n" + e1 || body1 === "NO-TRAILING-NEWLINE\n" + e1b, JSON.stringify(body1));
  // entry ends "\n\n" -> a second append needs NO separator (no double blank)
  const tC1 = new Date();
  await call({ todo: "guard entry two" }, { agent: "planner_1", sessionID: "ses_n" });
  const tC2 = new Date();
  const body2 = readFileSync(todoN, "utf-8");
  const e2 = entryWith(tC1, "##", "planner_1", "ses_n", "guard entry two");
  const e2b = entryWith(tC2, "##", "planner_1", "ses_n", "guard entry two");
  let sepOk = false;
  for (const first of [e1, e1b]) for (const second of [e2, e2b]) {
    if (body2 === "NO-TRAILING-NEWLINE\n" + first + second) sepOk = true;
  }
  chk("(N2) \\n-terminated target: NO extra separator (the entry ends blank; appends butt-join cleanly)", sepOk, JSON.stringify(body2));
  cleanupN();

  // a FRESH (absent) target starts clean — the probe skips (size 0 path)
  const projN2 = path.join(ROOT, "wsN2");
  mkdirSync(projN2, { recursive: true });
  const cleanupN2 = await plugin.setup(makeCtx(projN2));
  const tD1 = new Date();
  await call({ todo: "fresh start" }, { agent: "planner_1", sessionID: "ses_n2" });
  const tD2 = new Date();
  chk("(N3) absent target -> created carrying ONLY the entry (no leading separator)",
    okFile(readFileSync(path.join(projN2, "todo_inbox.md"), "utf-8"), "##", "planner_1", "ses_n2", "fresh start", tD1, tD2), JSON.stringify(readFileSync(path.join(projN2, "todo_inbox.md"), "utf-8")));
  cleanupN2();
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
