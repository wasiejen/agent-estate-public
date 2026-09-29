// context_trim.smoke.mjs — the context_trim custom tool (plan39, Unit 1 of
// the approved context-trim build; spec agent/handover/handover_task.md).
// It tests .opencode/tools/context_trim.ts — the CORE exports
// (reportWindow / tailSet) driven against a FIXTURE DB built by this smoke
// (NEVER the live one): the opencode-like session/message/part schema from
// the bounded read-only live-DB inspection (JSON `data` columns, FK cascade
// ON), ONE session carrying the full compaction quartet (~12 messages before
// the marker incl. 2 read parts with filePath/offset/limit, one bash, one
// webfetch; the marker + summary child; >=4 messages after the summary) and
// ONE no-marker session.
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
const { reportWindow, tailSet } = tool;

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
  "unknown session report → the session-not-found error line",
  (await reportWindow(FX, "ses_ct_dne")) === "session ses_ct_dne\nerror: session-not-found",
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

rmSync(SANDBOX, { recursive: true, force: true });
finish();
