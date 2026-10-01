// context_trim.smoke.mjs — the context_trim custom tool (plan39, Unit 1 of
// the approved context-trim build; spec agent/handover/handover_task.md).
// It tests .opencode/tools/context_trim.ts — the CORE exports
// (reportWindow / tailSet) driven against a FIXTURE DB built by this smoke
// (NEVER the live one): the opencode-like session/message/part schema from
// the bounded read-only live-DB inspection (JSON `data` columns, FK cascade
// ON), ONE session carrying the full compaction quartet (~12 messages before
// the marker incl. 2 read parts with filePath/offset/limit, one bash, one
// webfetch; the marker + summary child; >=4 messages after the summary) and
// ONE no-marker session. Section 9: tailSetKeep (TODO #120 Unit 2 — the
// keep-COUNT boundary form): a valid rewrite (keep=N → the N-th message
// strictly before the compaction user row) + the 5 rejections (floor /
// keep-exceeds-history / no-completed-compaction / session-not-found /
// keep-invalid), a dedicated ses_ct_k fixture, the spawn chain FORCED
// via setBackends.
// Run: node .opencode/plugin/tests/context_trim.smoke.mjs (plain node, exit 0 iff green).
import { DatabaseSync } from "node:sqlite";
import { rmSync } from "node:fs";
import path from "node:path";
import { freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const { chk, finish } = makeChecker("CONTEXT_TRIM_SMOKE");
const SANDBOX = freshSandbox("context_trim");
const FX = path.join(SANDBOX, "fixture.db");

// ---------------------------------------------------------------------------
// The fixture DB (the live-DB inspected shapes; FK cascade ON).
// ---------------------------------------------------------------------------
const DB = new DatabaseSync(FX);
DB.exec("PRAGMA foreign_keys = ON;");
DB.exec(`
  CREATE TABLE project (id TEXT PRIMARY KEY);
  CREATE TABLE session (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    time_created INTEGER NOT NULL,
    time_updated INTEGER NOT NULL
  );
  CREATE TABLE message (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    time_created INTEGER NOT NULL,
    time_updated INTEGER NOT NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE part (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES message(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    time_created INTEGER NOT NULL,
    time_updated INTEGER NOT NULL,
    data TEXT NOT NULL
  );
`);
DB.prepare("INSERT INTO project (id) VALUES (?)").run("prj_ct");

const insS = DB.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES (?, ?, ?, ?)");
const insM = DB.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?)");
const insP = DB.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, ?, ?, ?, ?)");

// The user row: role user + a text part (user rows carry no tokens).
const putUser = (sid, id, time, text) => {
  insM.run(id, sid, time, time, JSON.stringify({ role: "user", time: { created: time } }));
  insP.run(`p_${id}t`, id, sid, time, time, JSON.stringify({ type: "text", text }));
};
// The assistant row: role assistant + finish + tokens (S = in+out+cr) + parts.
const putAsst = (sid, id, time, tokens, parts) => {
  insM.run(id, sid, time, time, JSON.stringify({
    role: "assistant",
    parentID: `p_${id}u`,
    finish: "stop",
    tokens,
  }));
  parts.forEach((p, i) => insP.run(`p_${id}${String.fromCharCode(97 + i)}`, id, sid, time, time, JSON.stringify(p)));
};
const T = (n) => ({ total: 0, input: n.i, output: n.o, reasoning: 0, cache: { write: 0, read: n.cr } });
const READ = (fp, offset, limit) => ({ type: "tool", tool: "read", callID: "call_" + fp, state: { status: "completed", input: { filePath: fp, offset, limit }, output: "ok" } });
const BASH = (command) => ({ type: "tool", tool: "bash", callID: "call_bash", state: { status: "completed", input: { command }, output: "" } });
const WEB = (url) => ({ type: "tool", tool: "webfetch", callID: "call_web", state: { status: "completed", input: { url, format: "text" }, output: "doc" } });

// ses_ct_fix — ~12 messages before the marker, the full quartet, 4 after.
insS.run("ses_ct_fix", "prj_ct", 0, 0);
putUser("ses_ct_fix", "msg_01", 1000, "one");
putAsst("ses_ct_fix", "msg_02", 2000, T({ i: 100, o: 50, cr: 2000 }), [{ type: "text", text: "ok" }]);
putUser("ses_ct_fix", "msg_03", 3000, "three");
putAsst("ses_ct_fix", "msg_04", 4000, T({ i: 200, o: 100, cr: 4000 }), [{ type: "text", text: "ok" }]);
putUser("ses_ct_fix", "msg_05", 5000, "five");
putAsst("ses_ct_fix", "msg_06", 6000, T({ i: 300, o: 150, cr: 6000 }), [{ type: "text", text: "doc" }]);
putUser("ses_ct_fix", "msg_07", 7000, "seven");
putAsst("ses_ct_fix", "msg_08", 8000, T({ i: 400, o: 200, cr: 8000 }), [READ("/proj/alpha.md", 1, 40)]);
putUser("ses_ct_fix", "msg_09", 9000, "nine");
putAsst("ses_ct_fix", "msg_10", 10000, T({ i: 500, o: 250, cr: 10000 }), [READ("/proj/beta.md", 41, 80), BASH("ls -la")]);
putUser("ses_ct_fix", "msg_11", 11000, "eleven");
putAsst("ses_ct_fix", "msg_12", 12000, T({ i: 600, o: 300, cr: 12000 }), [WEB("https://example.com/doc")]);
// The marker quartet: the compaction user row (tail_start_id = msg_07 →
// retained tail msg_07..msg_12 = exactly the floor 6) + the summary child.
insM.run("msg_13", "ses_ct_fix", 13000, 13000, JSON.stringify({ role: "user", time: { created: 13000 } }));
insP.run("p_13c", "msg_13", "ses_ct_fix", 13000, 13000, JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_07" }));
insM.run("msg_14", "ses_ct_fix", 14000, 14000, JSON.stringify({
  role: "assistant", parentID: "msg_13", mode: "compaction", agent: "compaction", summary: true, finish: "stop",
}));
// >=4 messages after the summary.
putUser("ses_ct_fix", "msg_15", 15000, "post one");
putAsst("ses_ct_fix", "msg_16", 16000, T({ i: 700, o: 350, cr: 14000 }), [{ type: "text", text: "done" }]);
putUser("ses_ct_fix", "msg_17", 17000, "post three");
putAsst("ses_ct_fix", "msg_18", 18000, T({ i: 800, o: 400, cr: 16000 }), [{ type: "text", text: "done" }]);

// ses_ct_nomark — no compaction marker at all.
insS.run("ses_ct_nomark", "prj_ct", 0, 0);
putUser("ses_ct_nomark", "msg_n1", 100, "a");
putAsst("ses_ct_nomark", "msg_n2", 200, T({ i: 10, o: 5, cr: 100 }), [{ type: "text", text: "b" }]);
putUser("ses_ct_nomark", "msg_n3", 300, "c");
DB.close();

const tool = await loadRepo(".opencode/tools/context_trim.ts");
const { reportWindow, tailSet, tailSetKeep } = tool;

// ---------------------------------------------------------------------------
// 1) report window fields exact (the marker session)
// ---------------------------------------------------------------------------
const report = await reportWindow(FX, "ses_ct_fix");
const lines = report.split("\n");
chk(
  "report header fields exact (marker/summary/tail_start/retained/post-summary)",
  lines[0] === "session ses_ct_fix" &&
    lines[1] === "header: marker=msg_13 summary=msg_14 tail_start=msg_07 retained=6 post-summary=4",
  JSON.stringify(lines.slice(0, 2)),
);

// 2) the full report (no target) byte-exact — the retained-tail slice + the
//    post-summary slice in chronological order, mass per the spec's rule
//    (tokens in+out+cr when present, else bytes/4 of the part text)
const EXPECT_REPORT = [
  "session ses_ct_fix",
  "header: marker=msg_13 summary=msg_14 tail_start=msg_07 retained=6 post-summary=4",
  "row: msg_07 7000 user bytes4=1",
  "row: msg_08 8000 assistant tokens=8600 tool=read target=/proj/alpha.md offset=1 limit=40",
  "row: msg_09 9000 user bytes4=1",
  "row: msg_10 10000 assistant tokens=10750 tool=read target=/proj/beta.md offset=41 limit=80 tool=bash target=ls -la",
  "row: msg_11 11000 user bytes4=1",
  "row: msg_12 12000 assistant tokens=12900 tool=webfetch target=https://example.com/doc",
  "row: msg_15 15000 user bytes4=2",
  "row: msg_16 16000 assistant tokens=15050",
  "row: msg_17 17000 user bytes4=2",
  "row: msg_18 18000 assistant tokens=17200",
].join("\n");
chk("report (no target) byte-exact", report === EXPECT_REPORT, JSON.stringify(report));

// 3) rows carry the tool targets (read: filePath+offset/limit; bash:
//    command; webfetch: url)
const rowOf = (id) => lines.find((l) => l.startsWith(`row: ${id} `));
chk(
  "row carries the read target (filePath + offset + limit)",
  rowOf("msg_08") === "row: msg_08 8000 assistant tokens=8600 tool=read target=/proj/alpha.md offset=1 limit=40",
  JSON.stringify(rowOf("msg_08")),
);
chk(
  "row carries the read + bash targets (part order)",
  rowOf("msg_10") === "row: msg_10 10000 assistant tokens=10750 tool=read target=/proj/beta.md offset=41 limit=80 tool=bash target=ls -la",
  JSON.stringify(rowOf("msg_10")),
);
chk(
  "row carries the webfetch target (url)",
  rowOf("msg_12") === "row: msg_12 12000 assistant tokens=12900 tool=webfetch target=https://example.com/doc",
  JSON.stringify(rowOf("msg_12")),
);

// ---------------------------------------------------------------------------
// 4) dry-run counts exact (no write)
// ---------------------------------------------------------------------------
const dry06 = await reportWindow(FX, "ses_ct_fix", "msg_06");
chk(
  "dry-run (extend to msg_06): the exact remove/keep line + verdict=ok",
  dry06.endsWith("dry-run: target=msg_06 remove=0 (0 tokens) keep=7 (38703 tokens) verdict=ok") &&
    dry06.split("\n")[1] === lines[1] &&
    dry06 === EXPECT_REPORT + "\ndry-run: target=msg_06 remove=0 (0 tokens) keep=7 (38703 tokens) verdict=ok",
  JSON.stringify(dry06.split("\n").slice(-1)),
);
const dry08 = await reportWindow(FX, "ses_ct_fix", "msg_08");
chk(
  "dry-run (trim to msg_08): the exact remove/keep line + the floor verdict",
  dry08.endsWith("dry-run: target=msg_08 remove=1 (1 tokens) keep=5 (32252 tokens) verdict=rejected: retained-tail-below-floor 5"),
  JSON.stringify(dry08.split("\n").slice(-1)),
);

// ---------------------------------------------------------------------------
// 4b) the spawn-sqlite3 backend (TODO #126 — the forced-chain pins).
// A SECOND fixture session (ses_ct_spx, its own quartet) carries the
// spawn pins so the in-process pins' fixture state (ses_ct_fix) is
// untouched. The chain is FORCED to ["spawn-sqlite3"] via the
// setBackends test hook (the smoke host has node:sqlite — without the
// hook the spawn path is never reached).
// ---------------------------------------------------------------------------
const EXPECT_SPX = [
  "session ses_ct_spx",
  "header: marker=msg_s13 summary=msg_s14 tail_start=msg_s07 retained=1 post-summary=2",
  "row: msg_s07 700 user bytes4=1",
  "row: msg_s15 15000 user bytes4=2",
  "row: msg_s16 16000 assistant tokens=460",
].join("\n");
{
  const W = new DatabaseSync(FX);
  W.exec("PRAGMA foreign_keys = ON;");
  W.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_spx', 'prj_ct', 0, 0)").run();
  const putU = (id, time, text) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_spx', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_spx', ?, ?, ?)").run(`p_${id}t`, id, time, time, JSON.stringify({ type: "text", text }));
  };
  const putA = (id, time, tok) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_spx', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop", tokens: tok }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_spx', ?, ?, ?)").run(`p_${id}a`, id, time, time, JSON.stringify({ type: "text", text: "ok" }));
  };
  putU("msg_s01", 100, "s one");
  putA("msg_s02", 200, T({ i: 10, o: 5, cr: 100 }));
  putU("msg_s03", 300, "s three");
  putA("msg_s04", 400, T({ i: 20, o: 10, cr: 200 }));
  putU("msg_s05", 500, "s five");
  putA("msg_s06", 600, T({ i: 30, o: 15, cr: 300 }));
  putU("msg_s07", 700, "s seven");
  // The marker quartet (tail_start_id = msg_s07) + the summary child +
  // 2 messages after the summary.
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_s13', 'ses_ct_spx', 13000, 13000, ?)").run(JSON.stringify({ role: "user", time: { created: 13000 } }));
  W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_s13c', 'msg_s13', 'ses_ct_spx', 13000, 13000, ?)").run(JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_s07" }));
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_s14', 'ses_ct_spx', 14000, 14000, ?)").run(JSON.stringify({ role: "assistant", parentID: "msg_s13", summary: true, finish: "stop" }));
  putU("msg_s15", 15000, "s post one");
  putA("msg_s16", 16000, T({ i: 40, o: 20, cr: 400 }));
  W.close();
}
// 4c) ENOBUFS guard: a no-marker session carrying ONE >1 MB text part —
// the report pulls the part JSON through the CLI, so the spawn maxBuffer
// (16 MB) must hold (measured 2026-10-01: ENOBUFS at the old 1 MB on a
// live fork window with 1271 KB of parts).
{
  const WB = new DatabaseSync(FX);
  WB.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_big', 'prj_ct', 0, 0)").run();
  const BIG = "x".repeat(2 * 1024 * 1024);
  WB.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_b1', 'ses_ct_big', 100, 100, ?)").run(JSON.stringify({ role: "user", time: { created: 100 } }));
  WB.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_b1t', 'msg_b1', 'ses_ct_big', 100, 100, ?)").run(JSON.stringify({ type: "text", text: BIG }));
  WB.close();
  tool.setBackends(["spawn-sqlite3"]); // FORCED — the spawn-only guard pin
  const big = await reportWindow(FX, "ses_ct_big");
  tool.setBackends(); // restore the default chain
  chk(
    "spawn report survives a >1 MB part (ENOBUFS guard, 16 MB maxBuffer)",
    big.split("\n")[0] === "session ses_ct_big" && big.split("\n").some((l) => l.startsWith("row: msg_b1 ") && l.includes("bytes4=")),
    JSON.stringify(big.split("\n").slice(0, 3)),
  );
}
const spxDefault = await reportWindow(FX, "ses_ct_spx"); // in-process (the default chain)
tool.setBackends(["spawn-sqlite3"]); // FORCED — the spawn-only pins below
const spxSpawn = await reportWindow(FX, "ses_ct_spx");
chk(
  "spawn report = the in-process report byte-exact (the same key fields)",
  spxSpawn === spxDefault && spxSpawn === EXPECT_SPX,
  JSON.stringify(spxSpawn.split("\n")),
);
const tSpx = await tailSet(FX, "ses_ct_spx", "msg_s02");
chk(
  "spawn tail rewrite return line byte-exact (the ONE-CLI-call transaction)",
  tSpx === "tail= msg_s07 -> msg_s02 keep=6",
  JSON.stringify(tSpx),
);
{
  const RO = new DatabaseSync(FX, { readOnly: true });
  const partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_s13c'").get().data;
  RO.close();
  chk(
    "the part row carries the new tail_start_id (spawn path, readable back)",
    partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_s02"}',
    JSON.stringify(partJson),
  );
}
chk(
  "post-rewrite spawn report: retained=6 + the new tail head row (msg_s02)",
  (await reportWindow(FX, "ses_ct_spx")).split("\n")[1] === "header: marker=msg_s13 summary=msg_s14 tail_start=msg_s02 retained=6 post-summary=2" &&
    (await reportWindow(FX, "ses_ct_spx")).split("\n")[2] === "row: msg_s02 200 assistant tokens=115",
  JSON.stringify((await reportWindow(FX, "ses_ct_spx")).split("\n").slice(0, 3)),
);
chk(
  "spawn-path rejection: target AT the compaction row (validation still fires)",
  (await tailSet(FX, "ses_ct_spx", "msg_s13")) === "tail= rejected: target-not-before-compaction",
  JSON.stringify(await tailSet(FX, "ses_ct_spx", "msg_s13")),
);
tool.setBackends(); // restore the default chain for the in-process pins below

// ---------------------------------------------------------------------------
// 5) the tail rewrite lands (part JSON tail_start_id = target, return line
//    byte-exact) — the fixture is mutated from here on
// ---------------------------------------------------------------------------
const t = await tailSet(FX, "ses_ct_fix", "msg_06");
chk("tail rewrite return line byte-exact", t === "tail= msg_07 -> msg_06 keep=7", JSON.stringify(t));
{
  const RO = new DatabaseSync(FX, { readOnly: true });
  const partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_13c'").get().data;
  RO.close();
  chk(
    "the part row carries the new tail_start_id (single-field JSON edit, byte-exact)",
    partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_06"}',
    JSON.stringify(partJson),
  );
}
const report2 = await reportWindow(FX, "ses_ct_fix");
chk(
  "post-rewrite report: retained=7 + the new tail head row (msg_06) present",
  report2.split("\n")[1] === "header: marker=msg_13 summary=msg_14 tail_start=msg_06 retained=7 post-summary=4" &&
    report2.split("\n")[2] === "row: msg_06 6000 assistant tokens=6450",
  JSON.stringify(report2.split("\n").slice(0, 3)),
);

// ---------------------------------------------------------------------------
// 6) rejections — each with its reason (fail-closed, the guard mirrored)
// ---------------------------------------------------------------------------
chk(
  "rejection: no compaction marker (the no-marker session)",
  (await tailSet(FX, "ses_ct_nomark", "msg_n1")) === "tail= rejected: no-completed-compaction",
  JSON.stringify(await tailSet(FX, "ses_ct_nomark", "msg_n1")),
);
chk(
  "rejection: unknown target id",
  (await tailSet(FX, "ses_ct_fix", "msg_dne")) === "tail= rejected: target-not-found",
  JSON.stringify(await tailSet(FX, "ses_ct_fix", "msg_dne")),
);
chk(
  "rejection: target AT the compaction row",
  (await tailSet(FX, "ses_ct_fix", "msg_13")) === "tail= rejected: target-not-before-compaction",
  JSON.stringify(await tailSet(FX, "ses_ct_fix", "msg_13")),
);
chk(
  "rejection: target AFTER the compaction row (a post-summary message)",
  (await tailSet(FX, "ses_ct_fix", "msg_15")) === "tail= rejected: target-not-before-compaction",
  JSON.stringify(await tailSet(FX, "ses_ct_fix", "msg_15")),
);
chk(
  "rejection: floor violation (retained tail 5 < 6)",
  (await tailSet(FX, "ses_ct_fix", "msg_08")) === "tail= rejected: retained-tail-below-floor 5",
  JSON.stringify(await tailSet(FX, "ses_ct_fix", "msg_08")),
);
chk(
  "rejection: unknown session",
  (await tailSet(FX, "ses_ct_dne", "msg_01")) === "tail= rejected: session-not-found",
  JSON.stringify(await tailSet(FX, "ses_ct_dne", "msg_01")),
);

// ---------------------------------------------------------------------------
// 7) the no-marker session report (window = full history) + db errors
// ---------------------------------------------------------------------------
const EXPECT_NOMARK = [
  "session ses_ct_nomark",
  "header: marker=none summary=none tail_start=none retained=0 post-summary=0 window=full-history",
  "row: msg_n1 100 user bytes4=0",
  "row: msg_n2 200 assistant tokens=115",
  "row: msg_n3 300 user bytes4=0",
].join("\n");
chk(
  "no-marker report byte-exact (marker=none, full-history window)",
  (await reportWindow(FX, "ses_ct_nomark")) === EXPECT_NOMARK,
  JSON.stringify(await reportWindow(FX, "ses_ct_nomark")),
);
chk(
  "missing db path → the db-error line (never a throw)",
  (await reportWindow(path.join(SANDBOX, "missing.db"), "ses_ct_fix")).startsWith("db-error: db-missing "),
  JSON.stringify(await reportWindow(path.join(SANDBOX, "missing.db"), "ses_ct_fix")),
);
chk(
  "unknown session report → the plain report= rejected: line (no error surface)",
  (await reportWindow(FX, "ses_ct_dne")) === "session ses_ct_dne\nreport= rejected: session-not-found",
  JSON.stringify(await reportWindow(FX, "ses_ct_dne")),
);

// ---------------------------------------------------------------------------
// 8) FK cascade ON (the fixture property — verified on a throwaway session)
// ---------------------------------------------------------------------------
{
  const W = new DatabaseSync(FX);
  W.exec("PRAGMA foreign_keys = ON;");
  W.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_casc', 'prj_ct', 0, 0)").run();
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_c1', 'ses_ct_casc', 10, 10, ?)").run(JSON.stringify({ role: "user" }));
  W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_c1t', 'msg_c1', 'ses_ct_casc', 10, 10, ?)").run(JSON.stringify({ type: "text", text: "x" }));
  W.prepare("DELETE FROM message WHERE id = 'msg_c1'").run();
  const orphan = W.prepare("SELECT COUNT(*) AS n FROM part WHERE message_id = 'msg_c1'").get().n;
  W.close();
  chk("FK cascade: deleting the message cascades its part rows", orphan === 0, String(orphan));
}

// ---------------------------------------------------------------------------
// 9) tailSetKeep (TODO #120 Unit 2 — the keep-COUNT boundary form of
// tailSet): a THIRD dedicated fixture session (ses_ct_k — 10 messages
// before the marker, the marker quartet tail_start_id=msg_k05, the
// summary child, 2 after) so the earlier pins' fixture state is
// untouched. The chain is FORCED to ["spawn-sqlite3"] via the
// setBackends test hook. Valid case (keep=8 → the 8th message STRICTLY
// before the compaction user row, msg_k03) + the rejections (keep below
// the floor 6; keep above the pre-compaction message count; no
// completed compaction; unknown session; keep <= 0).
// ---------------------------------------------------------------------------
{
  const W = new DatabaseSync(FX);
  W.exec("PRAGMA foreign_keys = ON;");
  W.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_k', 'prj_ct', 0, 0)").run();
  const putK = (id, time, text) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_k', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_k', ?, ?, ?)").run(`p_${id}t`, id, time, time, JSON.stringify({ type: "text", text }));
  };
  const putKa = (id, time) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_k', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop" }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_k', ?, ?, ?)").run(`p_${id}a`, id, time, time, JSON.stringify({ type: "text", text: "ok" }));
  };
  // 10 messages before the marker (msg_k01..msg_k10).
  putK("msg_k01", 100, "k one"); putKa("msg_k02", 200);
  putK("msg_k03", 300, "k three"); putKa("msg_k04", 400);
  putK("msg_k05", 500, "k five"); putKa("msg_k06", 600);
  putK("msg_k07", 700, "k seven"); putKa("msg_k08", 800);
  putK("msg_k09", 900, "k nine"); putKa("msg_k10", 1000);
  // The marker quartet (tail_start_id = msg_k05) + the summary child +
  // 2 messages after the summary.
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_k11', 'ses_ct_k', 13000, 13000, ?)").run(JSON.stringify({ role: "user", time: { created: 13000 } }));
  W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_k11c', 'msg_k11', 'ses_ct_k', 13000, 13000, ?)").run(JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_k05" }));
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_k12', 'ses_ct_k', 14000, 14000, ?)").run(JSON.stringify({ role: "assistant", parentID: "msg_k11", summary: true, finish: "stop" }));
  putK("msg_k13", 15000, "k post one");
  putKa("msg_k14", 16000);
  W.close();
}
tool.setBackends(["spawn-sqlite3"]); // FORCED — the spawn-only pins (this section)
{
  const k = await tailSetKeep(FX, "ses_ct_k", 8);
  chk(
    "tailSetKeep valid: keep=8 → the 8th message STRICTLY before the compaction user row (msg_k03), the return line byte-exact",
    k === "tail-set= msg_k05 -> msg_k03 keep=8",
    JSON.stringify(k),
  );
}
{
  const RO = new DatabaseSync(FX, { readOnly: true });
  const partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_k11c'").get().data;
  RO.close();
  const rep = await reportWindow(FX, "ses_ct_k");
  chk(
    "tailSetKeep landed: the part row carries the new tail_start_id (single-field JSON edit, byte-exact) + the re-report shows retained=8",
    partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_k03"}' &&
      rep.split("\n")[1] === "header: marker=msg_k11 summary=msg_k12 tail_start=msg_k03 retained=8 post-summary=2",
    JSON.stringify({ partJson, h: rep.split("\n")[1] }),
  );
}
{
  const r1 = await tailSetKeep(FX, "ses_ct_k", 5);
  const r2 = await tailSetKeep(FX, "ses_ct_k", 50);
  const r3 = await tailSetKeep(FX, "ses_ct_nomark", 8);
  const r4 = await tailSetKeep(FX, "ses_ct_dne", 8);
  const r5 = await tailSetKeep(FX, "ses_ct_k", 0);
  chk(
    "tailSetKeep rejections (fail-closed, exact reasons): floor 5 / keep-exceeds-history 50 / no-completed-compaction / session-not-found / keep-invalid 0",
    r1 === "tail-set= rejected: retained-tail-below-floor 5" &&
      r2 === "tail-set= rejected: keep-exceeds-history 50" &&
      r3 === "tail-set= rejected: no-completed-compaction" &&
      r4 === "tail-set= rejected: session-not-found" &&
      r5 === "tail-set= rejected: keep-invalid 0",
    JSON.stringify({ r1, r2, r3, r4, r5 }),
  );
}
tool.setBackends(); // restore the default chain

rmSync(SANDBOX, { recursive: true, force: true });
finish();
