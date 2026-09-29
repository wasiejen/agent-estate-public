// submit.smoke.mjs — the submit tool (#53 Part B, the approved proposal
// 2026-09-17_agent-feedback-closedown.md + the 2026-09-28_submit-memory-
// channel.md memory channel): ONE unified append tool for the five agent-
// inbox channels (feedback / knowledge / todo / ideas / memory). The context
// object carries a SCRATCHPAD temp `directory` — NEVER the live targets
// (the real agent/agent_feedback.md /
// agent/knowledge/knowledge_inbox.md / todo_inbox.md are
// DO-NOT-touch for this smoke).
// Run: node .opencode/plugin/tests/submit.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const base = freshSandbox("submit");
const { chk, finish } = makeChecker("SUBMIT_SMOKE");

// Mirror of the tool's machine-computed local stamp (minute resolution) —
// used for the minute-boundary-safe expected-entry check (the clock can
// tick mid-call).
const localStamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
};

// The tool's hardcoded channel table mirrored for the expected-value checks
// (the spec pins these three exact paths; the header depth is the
// established form of each channel).
const REL = {
  feedback: "agent/agent_feedback.md",
  knowledge: "agent/knowledge/knowledge_inbox.md",
  todo: "todo_inbox.md",
  ideas: "agent/agent_ideas.md",
};
const HDR = { feedback: "###", knowledge: "##", todo: "##", ideas: "###" };
const NO_PARAMS_ERR = "error: none of feedback/knowledge/todo/ideas/memory provided — nothing written";
const CHANNEL_ORDER = ["feedback", "knowledge", "todo", "ideas", "memory"];
const mkEntry = (key, stamp, role, session, text) => `${HDR[key]} ${stamp} ${role} ${session}\n${text}\n\n`;
const mkBlock = (key, entry) => `${key}\ntarget: ${REL[key]}\nentry: ${entry}`;

// Fresh, cleaned project dir (EMPTY — no .opencode at all).
const mkproj = (name) => {
  const dir = path.join(base, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};
// NOTE: REL entries use forward slashes; on win32 path.join accepts them.
const fpath = (dir, key) => path.join(dir, REL[key]);

const mod = await loadRepo(".opencode/tools/submit.ts");
const t = mod.default;

try {
  // ---- shape checks
  chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string" && t.description.length > 0);
  chk("no stale 'name'/'parameters' keys", t != null && !("name" in t) && !("parameters" in t));
  chk("execute is async fn", t != null && typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
  chk(
    "all 5 channel args optional at parse (feedback/knowledge/todo/ideas/memory accept undefined) AND role/session are GONE from the schema (auto-filled from the context)",
    t != null && CHANNEL_ORDER.every((k) => t.args[k] != null && t.args[k].safeParse(undefined).success === true) && !("role" in t.args) && !("session" in t.args),
  );

  // ---- (A) feedback single-param, FALLBACK role/session: the context carries
  //      NO agent/sessionID, so the stamp falls back to the literal `agent`
  //      / `unknown` fields — the proof that role/session are auto-filled from
  //      the context (this is the fallback assertion the spec asks for)
  const projA = mkproj("A");
  const argsA = { feedback: "friction: the gauge command took a while to discover" };
  const tA1 = localStamp();
  const retA = await t.execute(argsA, { directory: projA });
  const tA2 = localStamp();
  const fA = fpath(projA, "feedback");
  const bodyA = fs.existsSync(fA) ? fs.readFileSync(fA, "utf-8") : null;
  const okEntryA = (s) => bodyA === mkEntry("feedback", s, "agent", "unknown", argsA.feedback);
  chk("(A) feedback append + FALLBACK: context WITHOUT agent/sessionID stamps `agent`/`unknown`; file created with EXACTLY the entry (### stamp), minute-boundary-safe", okEntryA(tA1) || okEntryA(tA2), `got=${JSON.stringify(bodyA)}`);
  chk("(A) no other target created", !fs.existsSync(fpath(projA, "knowledge")) && !fs.existsSync(fpath(projA, "todo")));
  const okRetA = (s) => retA === mkBlock("feedback", mkEntry("feedback", s, "agent", "unknown", argsA.feedback));
  chk("(A) return = `feedback` + `target:` + `entry:` with entry byte-exact == file content", okRetA(tA1) || okRetA(tA2), `got=${JSON.stringify(retA)}`);

  // ---- (B) knowledge single-param, role/session via the CONTEXT: `## ` stamp
  //      into the knowledge inbox (parent dir auto-created); the stamp is
  //      pinned from the context values (agent/sessionID)
  const projB = mkproj("B");
  const argsB = { knowledge: "probe S16 shows loop_log stamps are minute-resolution" };
  const roleB = "worker-13";
  const sesB = "ses_TEST_71";
  const tB1 = localStamp();
  const retB = await t.execute({ ...argsB }, { directory: projB, agent: roleB, sessionID: sesB });
  const tB2 = localStamp();
  const fB = fpath(projB, "knowledge");
  const bodyB = fs.existsSync(fB) ? fs.readFileSync(fB, "utf-8") : null;
  const okEntryB = (s) => bodyB === mkEntry("knowledge", s, roleB, sesB, argsB.knowledge);
  chk("(B) knowledge append: file created with EXACTLY the entry (## stamp, explicit role/session)", okEntryB(tB1) || okEntryB(tB2), `got=${JSON.stringify(bodyB)}`);
  const okRetB = (s) => retB === mkBlock("knowledge", mkEntry("knowledge", s, roleB, sesB, argsB.knowledge));
  chk("(B) return = `knowledge` + `target:` + `entry:`, byte-exact vs the file entry (minute-boundary-safe)", okRetB(tB1) || okRetB(tB2), `got=${JSON.stringify(retB)}`);

  // ---- (C) todo single-param: `## ` stamp into the repo-root todo_inbox.md
  const projC = mkproj("C");
  const argsC = { todo: "loose finding: the venv python path is not on PATH (use ./.venv/Scripts/python.exe)" };
  const tC1 = localStamp();
  const retC = await t.execute(argsC, { directory: projC });
  const tC2 = localStamp();
  const fC = fpath(projC, "todo");
  const bodyC = fs.existsSync(fC) ? fs.readFileSync(fC, "utf-8") : null;
  const okEntryC = (s) => bodyC === mkEntry("todo", s, "agent", "unknown", argsC.todo);
  chk("(C) todo append: repo-root file created with EXACTLY the entry (## stamp)", okEntryC(tC1) || okEntryC(tC2), `got=${JSON.stringify(bodyC)}`);
  const okRetC = (s) => retC === mkBlock("todo", mkEntry("todo", s, "agent", "unknown", argsC.todo));
  chk("(C) return byte-exact vs the file entry", okRetC(tC1) || okRetC(tC2), `got=${JSON.stringify(retC)}`);

  // ---- (D) no-params / all-empty: the exact error string, NOTHING written
  const projD = mkproj("D");
  const retD = await t.execute({}, { directory: projD });
  chk("(D) none provided -> the exact error string", retD === NO_PARAMS_ERR, `got=${JSON.stringify(retD)}`);
  chk("(D) no file touched (fresh project dir stays empty)", !fs.existsSync(path.join(projD, "agent")) && !fs.existsSync(fpath(projD, "todo")));
  const projD2 = mkproj("D2");
  const retD2 = await t.execute({ feedback: "", knowledge: "   ", todo: "", memory: "" }, { directory: projD2 });
  chk("(D) empty/blank strings count as NOT provided -> same error, no file", retD2 === NO_PARAMS_ERR && !fs.existsSync(path.join(projD2, "agent")) && !fs.existsSync(fpath(projD2, "todo")), `got=${JSON.stringify(retD2)}`);

  // ---- (E) multi-param: all FIVE provided in ONE call — one shared stamp,
  //      five files, the return = the five blocks in feedback/knowledge/
  //      todo/ideas/memory order (memory target = the role-prefix namespace
  //      `probe-smoke`, no underscore -> the whole id is the prefix)
  const projE = mkproj("E");
  const memRelE = "agent/memory/probe-smoke/memory_inbox.md";
  const fpathE = (k) => (k === "memory" ? path.join(projE, memRelE) : fpath(projE, k));
  const roleE = "probe-smoke";
  const sesE = "ses_TEST_72";
  const argsE = {
    feedback: "multi: friction line",
    knowledge: "multi: knowledge line",
    todo: "multi: finding line",
    ideas: "multi: idea line",
    memory: "multi: memory line",
  };
  const tE1 = localStamp();
  const retE = await t.execute(argsE, { directory: projE, agent: roleE, sessionID: sesE });
  const tE2 = localStamp();
  const entryForE = (k, s) => (k === "memory" ? `### ${s} ${roleE} ${sesE}\n${argsE[k]}\n\n` : mkEntry(k, s, roleE, sesE, argsE[k]));
  const relForE = (k) => (k === "memory" ? memRelE : REL[k]);
  const bodyE = (k) => { const f = fpathE(k); return fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : null; };
  const mkRetE = (s) => CHANNEL_ORDER.map((k) => `${k}\ntarget: ${relForE(k)}\nentry: ${entryForE(k, s)}`).join("\n");
  const okFilesE = (s) => CHANNEL_ORDER.every((k) => bodyE(k) === entryForE(k, s));
  chk("(E) multi-param: all five files created with byte-exact entries (minute-boundary-safe)", okFilesE(tE1) || okFilesE(tE2), JSON.stringify(CHANNEL_ORDER.map((k) => bodyE(k))));
  const okRetE = (s) => retE === mkRetE(s);
  chk("(E) return = the five blocks in feedback/knowledge/todo/ideas/memory order (byte-exact)", okRetE(tE1) || okRetE(tE2), `got=${JSON.stringify(retE)}`);
  // explicit: the five entries in the five files carry the SAME stamp
  const stampsE = CHANNEL_ORDER.map((k) => (bodyE(k) ?? "").split("\n")[0].split(" ")[1]);
  chk("(E) the five entries share ONE stamp (captured once per call)", stampsE.every((s) => /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/.test(s ?? "")) && new Set(stampsE).size === 1, JSON.stringify(stampsE));

  // ---- (G) ideas single-param (2026-09-27 ruling): `### ` stamp into the
  //      agent-side ideas inbox agent/agent_ideas.md — the
  //      MAINTAINER's ideas.md is NOT a target (read-only inspiration)
  const projG = mkproj("G");
  const argsG = { ideas: "idea: the maintenance pass should scan agent_ideas.md and the maintainer's ideas.md" };
  const tG1 = localStamp();
  const retG = await t.execute(argsG, { directory: projG, agent: "planner-27", sessionID: "ses_TEST_74" });
  const tG2 = localStamp();
  const fG = fpath(projG, "ideas");
  const bodyG = fs.existsSync(fG) ? fs.readFileSync(fG, "utf-8") : null;
  const okEntryG = (s) => bodyG === mkEntry("ideas", s, "planner-27", "ses_TEST_74", argsG.ideas);
  chk("(G) ideas append: agent_ideas.md created with EXACTLY the entry (### stamp)", okEntryG(tG1) || okEntryG(tG2), `got=${JSON.stringify(bodyG)}`);
  chk("(G) the maintainer-side ideas.md path is NOT touched (no maintainer/ under the sandbox)", !fs.existsSync(path.join(projG, "maintainer")));
  const okRetG = (s) => retG === mkBlock("ideas", mkEntry("ideas", s, "planner-27", "ses_TEST_74", argsG.ideas));
  chk("(G) return = `ideas` + `target:` + `entry:`, byte-exact vs the file entry", okRetG(tG1) || okRetG(tG2), `got=${JSON.stringify(retG)}`);

  // ---- (H) memory single-param: the ROLE-SCOPED target
  //      agent/memory/<role-prefix>/memory_inbox.md (<role> = the agent id
  //      BEFORE the first '_'); the inbox FILE and its role FOLDER are
  //      created when not already existing (ruling 3); the entry uses the
  //      same stamp form (### header) as the other channels
  const memFile = (proj, prefix) => path.join(proj, "agent", "memory", prefix, "memory_inbox.md");
  const memEntry = (stamp, role, session, text) => `### ${stamp} ${role} ${session}\n${text}\n\n`;
  const memBlock = (prefix, entry) => `memory\ntarget: agent/memory/${prefix}/memory_inbox.md\nentry: ${entry}`;

  const projH = mkproj("H");
  const roleH = "planner_Q3S_245K_slow";
  const sesH = "ses_TEST_76";
  const textH = "memory: the submit memory channel appends to agent/memory/<role>/memory_inbox.md";
  const tH1 = localStamp();
  const retH = await t.execute({ memory: textH }, { directory: projH, agent: roleH, sessionID: sesH });
  const tH2 = localStamp();
  const fH = memFile(projH, "planner");
  const bodyH = fs.existsSync(fH) ? fs.readFileSync(fH, "utf-8") : null;
  const okEntryH = (s) => bodyH === memEntry(s, roleH, sesH, textH);
  chk("(H) memory append: role-prefix `planner` resolves to agent/memory/planner/memory_inbox.md (folder + file auto-created), byte-exact entry", okEntryH(tH1) || okEntryH(tH2), `got=${JSON.stringify(bodyH)}`);
  const okRetH = (s) => retH === memBlock("planner", memEntry(s, roleH, sesH, textH));
  chk("(H) return = `memory` + `target:` + `entry:` byte-exact vs the file entry (minute-boundary-safe)", okRetH(tH1) || okRetH(tH2), `got=${JSON.stringify(retH)}`);
  chk("(H) no other channel target created", !fs.existsSync(fpath(projH, "feedback")) && !fs.existsSync(fpath(projH, "todo")) && !fs.existsSync(path.join(projH, "agent", "agent_feedback.md")));

  // (H2) underscore-split prefix for a worker id
  const projH2 = mkproj("H2");
  const roleH2 = "worker_Q3S_170K";
  const sesH2 = "ses_TEST_77";
  const tH2a = localStamp();
  await t.execute({ memory: "worker memory line" }, { directory: projH2, agent: roleH2, sessionID: sesH2 });
  const tH2b = localStamp();
  const bodyH2 = fs.existsSync(memFile(projH2, "worker")) ? fs.readFileSync(memFile(projH2, "worker"), "utf-8") : null;
  const okH2 = (s) => bodyH2 === memEntry(s, roleH2, sesH2, "worker memory line");
  chk("(H2) `worker_Q3S_170K` -> prefix `worker` (agent/memory/worker/memory_inbox.md)", okH2(tH2a) || okH2(tH2b), `got=${JSON.stringify(bodyH2)}`);
  chk("(H2) the unsplit id did NOT become a namespace", !fs.existsSync(memFile(projH2, "worker_Q3S_170K")));

  // (H3) FALLBACK: context WITHOUT agent -> the `agent` namespace, stamp role `agent`/`unknown`
  const projH3 = mkproj("H3");
  const tH3a = localStamp();
  const retH3 = await t.execute({ memory: "fallback memory line" }, { directory: projH3 });
  const tH3b = localStamp();
  const bodyH3 = fs.existsSync(memFile(projH3, "agent")) ? fs.readFileSync(memFile(projH3, "agent"), "utf-8") : null;
  const okH3 = (s) => bodyH3 === memEntry(s, "agent", "unknown", "fallback memory line");
  chk("(H3) no agent in context -> prefix `agent` (agent/memory/agent/memory_inbox.md), stamp role `agent`/`unknown`", okH3(tH3a) || okH3(tH3b), `got=${JSON.stringify(bodyH3)}`);
  const okRetH3 = (s) => retH3 === memBlock("agent", memEntry(s, "agent", "unknown", "fallback memory line"));
  chk("(H3) return byte-exact", okRetH3(tH3a) || okRetH3(tH3b), `got=${JSON.stringify(retH3)}`);

  // (H4) append-only into an EXISTING inbox: the pre-seeded entry stays
  //      byte-exact before the appended one
  const projH4 = mkproj("H4");
  const fH4 = memFile(projH4, "planner");
  fs.mkdirSync(path.dirname(fH4), { recursive: true });
  const seeded = memEntry("2026-09-01_00-00", "planner-1", "ses_SEED", "SENTINEL memory — must survive byte-exact.");
  fs.writeFileSync(fH4, seeded, "utf-8");
  const tH4a = localStamp();
  await t.execute({ memory: "second memory line" }, { directory: projH4, agent: "planner_slow", sessionID: "ses_TEST_78" });
  const tH4b = localStamp();
  const bodyH4 = fs.readFileSync(fH4, "utf-8");
  const okH4 = (s) => bodyH4 === seeded + memEntry(s, "planner_slow", "ses_TEST_78", "second memory line");
  chk("(H4) existing inbox: sentinel stays byte-exact BEFORE the appended entry (append-only)", okH4(tH4a) || okH4(tH4b), `got=${JSON.stringify(bodyH4)}`);

  // ---- (F) never-read preservation: pre-seeded sentinel lines stay
  //      BYTE-EXACT before the appended entry; the other targets (not
  //      provided in the call) are byte-identical — the tool appends, never
  //      reads/rewrites
  const projF = mkproj("F");
  const seedF = (k, line) => { const f = fpath(projF, k); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, line + "\n", "utf-8"); };
  seedF("feedback", "SENTINEL fb — pre-existing content must survive byte-exact.");
  seedF("knowledge", "SENTINEL kn — must stay byte-identical.");
  seedF("todo", "SENTINEL todo — must stay byte-identical.");
  const roleF = "worker-14";
  const sesF = "ses_TEST_73";
  const argsF = { feedback: "friction after pre-seed" };
  const tF1 = localStamp();
  const retF = await t.execute(argsF, { directory: projF, agent: roleF, sessionID: sesF });
  const tF2 = localStamp();
  const fbBody = fs.readFileSync(fpath(projF, "feedback"), "utf-8");
  const okFb = (s) => fbBody === "SENTINEL fb — pre-existing content must survive byte-exact.\n" + mkEntry("feedback", s, roleF, sesF, argsF.feedback);
  chk("(F) pre-seeded sentinel stays byte-exact BEFORE the appended entry (append-only)", okFb(tF1) || okFb(tF2), `got=${JSON.stringify(fbBody)}`);
  chk("(F) the other two targets are byte-identical (untouched)", fs.readFileSync(fpath(projF, "knowledge"), "utf-8") === "SENTINEL kn — must stay byte-identical.\n" && fs.readFileSync(fpath(projF, "todo"), "utf-8") === "SENTINEL todo — must stay byte-identical.\n");
  const okRetF = (s) => retF === mkBlock("feedback", mkEntry("feedback", s, roleF, sesF, argsF.feedback));
  chk("(F) return reflects only the provided param (feedback block only, byte-exact, minute-boundary-safe)", okRetF(tF1) || okRetF(tF2), `got=${JSON.stringify(retF)}`);
} finally {
  fs.rmSync(base, { recursive: true, force: true });
}

finish();
