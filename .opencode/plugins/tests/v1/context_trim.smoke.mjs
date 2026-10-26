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
// via setBackends. Section 10: the TOOL SURFACE keepMessages argument on
// `tail` mode (U0 of the context budget package, 2026-10-01 — mutually
// exclusive with target, delegating to the existing tailSetKeep core):
// the keep-form pins THROUGH the tool() execute() surface (the gauge's
// setDbPath test hook steers the surface at THIS fixture), a dedicated
// ses_ct_sfc fixture: valid + the 5 rejections (no DB write) + the
// surface guards (mutual exclusion / neither form). Section 11: the U1
// recommendation leg (context budget package, 2026-10-01) — the
// cut-down report form (numbered rows + `last: N`), the low/medium/high
// recommendation block (each anchored at a messageID with the
// read/thought/shell mass split of retained vs dropped + the
// oldest-kept one-line hint), and the top-5 biggest-droppable list:
// a dedicated ses_ct_u1 fixture (12 pre-marker messages with
// non-trivial tool outputs, the marker quartet tail_start_id=msg_u07,
// 4 after) — ALL mass figures MACHINE-RECOMPUTED from the fixture DB
// (#99 pin style — no hardcoded tokens); the full form stays
// byte-identical through the core reportWindow (no opts).
// Run: node .opencode/plugins/tests/v1/context_trim.smoke.mjs (plain node, exit 0 iff green).
import { DatabaseSync } from "node:sqlite";
// #144: the retry-on-EBUSY teardown helper (rmTear) replaces the bare node:fs rmSync import.
import path from "node:path";
import { existsSync } from "node:fs";
import { freshSandbox, loadRepo, makeChecker, rmTear } from "./_smoke_base.mjs";

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
// #150 unit A (2026-10-26): the gauge core AND the maintainer-placed CLI moved into
// the v2 estate. The exe is resolved from the CORE's own directory, so the forced
// spawn lane must still find it — the path numbers in the core stayed valid.
{
  const core150 = await loadRepo(".opencode/plugins/scripts/gauge.mjs");
  chk(
    "spawn-sqlite3 (#126): DEFAULT_EXE_PATH resolves to an EXISTING file under .opencode/plugins/tools/ after the move (#150)",
    existsSync(core150.DEFAULT_EXE_PATH) && core150.DEFAULT_EXE_PATH.includes(path.join("plugins", "tools")),
    core150.DEFAULT_EXE_PATH,
  );
}
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

// ---------------------------------------------------------------------------
// 10) TOOL SURFACE keep form (U0 of the context budget package, 2026-10-01
// — the keepMessages argument on `tail` mode, mutually exclusive with
// target, delegating to the existing tailSetKeep core): pins THROUGH the
// tool() execute() surface. The gauge's setDbPath test hook steers the
// surface at THIS fixture DB (the live opencode.db is NEVER touched). A
// FOURTH dedicated fixture session (ses_ct_sfc — 10 messages before the
// marker, the marker quartet tail_start_id=msg_f05, the summary child,
// 2 after) so the earlier pins' fixture state is untouched.
// ---------------------------------------------------------------------------
{
  const W = new DatabaseSync(FX);
  W.exec("PRAGMA foreign_keys = ON;");
  W.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_sfc', 'prj_ct', 0, 0)").run();
  const putF = (id, time, text) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_sfc', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_sfc', ?, ?, ?)").run(`p_${id}t`, id, time, time, JSON.stringify({ type: "text", text }));
  };
  const putFa = (id, time) => {
    W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_sfc', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop" }));
    W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_sfc', ?, ?, ?)").run(`p_${id}a`, id, time, time, JSON.stringify({ type: "text", text: "ok" }));
  };
  // 10 messages before the marker (msg_f01..msg_f10).
  putF("msg_f01", 100, "f one"); putFa("msg_f02", 200);
  putF("msg_f03", 300, "f three"); putFa("msg_f04", 400);
  putF("msg_f05", 500, "f five"); putFa("msg_f06", 600);
  putF("msg_f07", 700, "f seven"); putFa("msg_f08", 800);
  putF("msg_f09", 900, "f nine"); putFa("msg_f10", 1000);
  // The marker quartet (tail_start_id = msg_f05) + the summary child +
  // 2 messages after the summary.
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_f11', 'ses_ct_sfc', 13000, 13000, ?)").run(JSON.stringify({ role: "user", time: { created: 13000 } }));
  W.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_f11c', 'msg_f11', 'ses_ct_sfc', 13000, 13000, ?)").run(JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_f05" }));
  W.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_f12', 'ses_ct_sfc', 14000, 14000, ?)").run(JSON.stringify({ role: "assistant", parentID: "msg_f11", summary: true, finish: "stop" }));
  putF("msg_f13", 15000, "f post one");
  putFa("msg_f14", 16000);
  W.close();
}
const gauge = await loadRepo(".opencode/plugins/scripts/gauge.mjs");
const surf = tool.default;
const dbBefore = gauge.getDbPath();
gauge.setDbPath(FX); // steer the tool surface at the fixture (restored after)
{
  const k = await surf.execute({ mode: "tail", session: "ses_ct_sfc", keepMessages: 8 }, {});
  chk(
    "surface keep form VALID: keep=8 → the 8th message STRICTLY before the compaction user row (msg_f03), the return line byte-exact (the same shape as the messageID form)",
    k === "tail-set= msg_f05 -> msg_f03 keep=8",
    JSON.stringify(k),
  );
}
{
  const RO = new DatabaseSync(FX, { readOnly: true });
  const partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_f11c'").get().data;
  RO.close();
  const rep = await surf.execute({ mode: "report", session: "ses_ct_sfc" }, {});
  chk(
    "surface keep form LANDED: the part row carries the new tail_start_id (byte-exact) + the SURFACE report shows retained=8",
    partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_f03"}' &&
      rep.split("\n")[1] === "header: marker=msg_f11 summary=msg_f12 tail_start=msg_f03 retained=8 post-summary=2",
    JSON.stringify({ partJson, h: rep.split("\n")[1] }),
  );
}
{
  const r1 = await surf.execute({ mode: "tail", session: "ses_ct_sfc", keepMessages: 5 }, {});
  const r2 = await surf.execute({ mode: "tail", session: "ses_ct_sfc", keepMessages: 50 }, {});
  const r3 = await surf.execute({ mode: "tail", session: "ses_ct_nomark", keepMessages: 8 }, {});
  const r4 = await surf.execute({ mode: "tail", session: "ses_ct_dne", keepMessages: 8 }, {});
  const r5 = await surf.execute({ mode: "tail", session: "ses_ct_sfc", keepMessages: 0 }, {});
  chk(
    "surface keep form rejections (fail-closed, exact reasons): floor 5 / keep-exceeds-history 50 / no-completed-compaction / session-not-found / keep-invalid 0",
    r1 === "tail-set= rejected: retained-tail-below-floor 5" &&
      r2 === "tail-set= rejected: keep-exceeds-history 50" &&
      r3 === "tail-set= rejected: no-completed-compaction" &&
      r4 === "tail-set= rejected: session-not-found" &&
      r5 === "tail-set= rejected: keep-invalid 0",
    JSON.stringify({ r1, r2, r3, r4, r5 }),
  );
  const RO = new DatabaseSync(FX, { readOnly: true });
  const partJson = RO.prepare("SELECT data FROM part WHERE id = 'p_f11c'").get().data;
  RO.close();
  chk(
    "surface keep form rejections performed NO DB write (the part row unchanged after the 5 rejections)",
    partJson === '{"type":"compaction","auto":false,"tail_start_id":"msg_f03"}',
    JSON.stringify(partJson),
  );
}
{
  const both = await surf.execute({ mode: "tail", session: "ses_ct_sfc", target: "msg_f03", keepMessages: 8 }, {});
  const neither = await surf.execute({ mode: "tail", session: "ses_ct_sfc" }, {});
  chk(
    "surface guards: target + keepMessages mutually exclusive; neither form → the exact error lines",
    both === "error: tail mode: target and keepMessages are mutually exclusive (use one or the other)" &&
      neither === "error: tail mode requires target (the new tail_start_id message id) or keepMessages (the retained-tail message count)",
    JSON.stringify({ both, neither }),
  );
}
gauge.setDbPath(dbBefore); // restore the original db path

// ---------------------------------------------------------------------------
// 11) U1 (context budget package, 2026-10-01): the recommendation leg on
// `report` — the cut-down form (NUMBERED rows 1..N from the window start,
// tool-target detail only, the `last: N` flag), the RECOMMENDATION block
// (3 retention options low / medium / high, each anchored at a messageID
// with its keep count + the read / thought / shell mass split of retained
// vs dropped + the oldest-kept message's one-line hint), and the
// BIGGEST-DROPPABLE list (top-5 heavy finished turns — window row number
// + mass). A FIFTH dedicated fixture session (ses_ct_u1): 12 messages
// before the marker, the marker quartet tail_start_id=msg_u07, the
// summary child, 4 after — non-trivial tool outputs so the category
// splits are nonzero. ALL mass figures are MACHINE-RECOMPUTED from the
// fixture DB below (#99 pin style — never hardcoded tokens).
// ---------------------------------------------------------------------------
{
  const WU = new DatabaseSync(FX);
  WU.exec("PRAGMA foreign_keys = ON;");
  WU.prepare("INSERT INTO session (id, project_id, time_created, time_updated) VALUES ('ses_ct_u1', 'prj_ct', 0, 0)").run();
  const putU = (id, time, text) => {
    WU.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_u1', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "user", time: { created: time } }));
    WU.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_u1', ?, ?, ?)").run(`p_${id}t`, id, time, time, JSON.stringify({ type: "text", text }));
  };
  const putA = (id, time, tok, parts) => {
    WU.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES (?, 'ses_ct_u1', ?, ?, ?)").run(id, time, time, JSON.stringify({ role: "assistant", parentID: `p_${id}u`, finish: "stop", tokens: tok }));
    parts.forEach((p, i) =>
      WU.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES (?, ?, 'ses_ct_u1', ?, ?, ?)").run(`p_${id}${String.fromCharCode(97 + i)}`, id, time, time, JSON.stringify(p)),
    );
  };
  const T2 = (n) => ({ total: 0, input: n.i, output: n.o, reasoning: 0, cache: { write: 0, read: n.cr } });
  const RD = (fp, offset, limit, out) => ({ type: "tool", tool: "read", callID: "call_" + fp, state: { status: "completed", input: { filePath: fp, offset, limit }, output: out } });
  const BS = (command, out) => ({ type: "tool", tool: "bash", callID: "call_b", state: { status: "completed", input: { command }, output: out } });
  const WF = (url, out) => ({ type: "tool", tool: "webfetch", callID: "call_w", state: { status: "completed", input: { url, format: "text" }, output: out } });
  putU("msg_u01", 100, "u one");
  putA("msg_u02", 200, T2({ i: 40, o: 20, cr: 400 }), [RD("/u1/alpha.md", 1, 30, "A".repeat(1000))]);
  putU("msg_u03", 300, "u three");
  putA("msg_u04", 400, T2({ i: 80, o: 40, cr: 800 }), [BS("node gate.mjs", "B".repeat(400))]);
  putU("msg_u05", 500, "u five");
  putA("msg_u06", 600, T2({ i: 120, o: 60, cr: 1200 }), [WF("https://ex.com/doc", "C".repeat(600))]);
  putU("msg_u07", 700, "u seven");
  putA("msg_u08", 800, T2({ i: 160, o: 80, cr: 1600 }), [{ type: "text", text: "P".repeat(200) }]);
  putU("msg_u09", 900, "u nine");
  putA("msg_u10", 1000, T2({ i: 200, o: 100, cr: 2000 }), [RD("/u1/beta.md", 1, 80, "D".repeat(2000)), BS("ls -la", "E".repeat(200))]);
  putU("msg_u11", 1100, "u eleven");
  putA("msg_u12", 1200, T2({ i: 240, o: 120, cr: 2400 }), [BS("node smoke.mjs", "F".repeat(800)), { type: "text", text: "G".repeat(100) }]);
  // The marker quartet (tail_start_id = msg_u07) + the summary child +
  // 4 messages after the summary.
  WU.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_u13', 'ses_ct_u1', 13000, 13000, ?)").run(JSON.stringify({ role: "user", time: { created: 13000 } }));
  WU.prepare("INSERT INTO part (id, message_id, session_id, time_created, time_updated, data) VALUES ('p_u13c', 'msg_u13', 'ses_ct_u1', 13000, 13000, ?)").run(JSON.stringify({ type: "compaction", auto: false, tail_start_id: "msg_u07" }));
  WU.prepare("INSERT INTO message (id, session_id, time_created, time_updated, data) VALUES ('msg_u14', 'ses_ct_u1', 14000, 14000, ?)").run(JSON.stringify({ role: "assistant", parentID: "msg_u13", summary: true, finish: "stop" }));
  putU("msg_u15", 15000, "u post one");
  putA("msg_u16", 16000, T2({ i: 300, o: 150, cr: 3000 }), [{ type: "text", text: "done" }]);
  putU("msg_u17", 17000, "u post three");
  putA("msg_u18", 18000, T2({ i: 340, o: 170, cr: 3400 }), [BS("echo hi", "H".repeat(300))]);
  WU.close();
}

// The machine-recomputed reference (#99 pin style): loads the session
// from the FIXTURE DB and recomputes the per-message mass (the tool's
// rule: tokens in+out+cr when present, else bytes/4 of the part text),
// the read / thought / shell split (the part bytes per category, floored
// to /4 per category), and the window row shapes — no mass figure below
// is hardcoded.
function u1Load(sid) {
  const R = new DatabaseSync(FX, { readOnly: true });
  const mRows = R.prepare("SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC, id ASC").all(sid);
  const pRows = R.prepare("SELECT message_id, data FROM part WHERE session_id = ? ORDER BY message_id ASC, id ASC").all(sid);
  R.close();
  const byMsg = new Map();
  for (const r of pRows) {
    const list = byMsg.get(r.message_id);
    if (list) list.push(JSON.parse(r.data));
    else byMsg.set(r.message_id, [JSON.parse(r.data)]);
  }
  return mRows.map((r) => ({ id: r.id, time: Number(r.time_created), data: JSON.parse(r.data), parts: byMsg.get(r.id) ?? [] }));
}
const u1HasTok = (m) => {
  const t = m.data?.tokens;
  return t != null && Number.isFinite(t.input) && Number.isFinite(t.output) && t?.cache != null && Number.isFinite(t.cache.read);
};
const u1Mass = (m) => {
  if (u1HasTok(m)) return m.data.tokens.input + m.data.tokens.output + m.data.tokens.cache.read;
  let bytes = 0;
  for (const p of m.parts) {
    if (p?.type === "text" && typeof p?.text === "string") bytes += Buffer.byteLength(p.text, "utf8");
    else if (p?.type === "tool" && typeof p?.state?.output === "string") bytes += Buffer.byteLength(p.state.output, "utf8");
  }
  return Math.floor(bytes / 4);
};
const u1Target = (p) => {
  if (p?.type !== "tool") return null;
  const input = p?.state?.input;
  if (p.tool === "read" && typeof input?.filePath === "string") {
    let s = input.filePath;
    if (Number.isFinite(input?.offset)) s += ` offset=${input.offset}`;
    if (Number.isFinite(input?.limit)) s += ` limit=${input.limit}`;
    return s;
  }
  if (p.tool === "bash" && typeof input?.command === "string") return input.command;
  if (p.tool === "webfetch" && typeof input?.url === "string") return input.url;
  return null;
};
const u1Split = (set) => {
  let read = 0;
  let thought = 0;
  let shell = 0;
  for (const m of set) {
    for (const p of m.parts) {
      if (p?.type === "text" && typeof p?.text === "string") thought += Buffer.byteLength(p.text, "utf8");
      else if (p?.type === "tool" && typeof p?.state?.output === "string") {
        if (p.tool === "read" || p.tool === "webfetch") read += Buffer.byteLength(p.state.output, "utf8");
        else if (p.tool === "bash") shell += Buffer.byteLength(p.state.output, "utf8");
      }
    }
  }
  return { read: Math.floor(read / 4), thought: Math.floor(thought / 4), shell: Math.floor(shell / 4) };
};
const u1Row = (m, prefix) => {
  let s = `${prefix} ${m.data?.role ?? "?"} ${u1HasTok(m) ? "tokens" : "bytes4"}=${u1Mass(m)}`;
  for (const p of m.parts) {
    if (p?.type !== "tool") continue;
    s += ` tool=${p.tool}`;
    const t = u1Target(p);
    if (t != null) s += ` target=${t}`;
  }
  return s;
};
const u1Biggest = (window, topN) =>
  `biggest: ${window
    .map((m, i) => ({ row: i + 1, mass: u1Mass(m), m }))
    .filter((t) => t.m.data?.role === "assistant" && t.m.data?.finish && !t.m.data?.error)
    .sort((a, b) => b.mass - a.mass || a.row - b.row)
    .slice(0, topN)
    .map((t) => `${t.row}=${t.mass}`)
    .join(" ")}`;

// The fixture window (marker msg_u13 at index 12, the tail msg_u07 at
// index 6, the summary at index 13): window = [6..12) + [14..18).
const u1Msgs = u1Load("ses_ct_u1");
const u1Window = [...u1Msgs.slice(6, 12), ...u1Msgs.slice(14)];
const u1Option = (label, idx) => {
  const retained = [...u1Msgs.slice(idx, 12), ...u1Msgs.slice(14)];
  const dropped = u1Msgs.slice(0, idx);
  const rs = u1Split(retained);
  const ds = u1Split(dropped);
  const rm = retained.reduce((a, m) => a + u1Mass(m), 0);
  const dm = dropped.reduce((a, m) => a + u1Mass(m), 0);
  let hint;
  for (const p of u1Msgs[idx].parts) if (p?.type === "text" && typeof p?.text === "string") { hint = p.text.slice(0, 48); break; }
  if (hint == null) {
    for (const p of u1Msgs[idx].parts) {
      if (p?.type !== "tool") continue;
      const t = u1Target(p);
      if (t != null) { hint = t.slice(0, 48); break; }
    }
  }
  if (hint == null) hint = String(u1Msgs[idx].data?.role ?? "?");
  return `option ${label}: msg=${u1Msgs[idx].id} keep=${12 - idx} retained=${rm} (read=${rs.read} thought=${rs.thought} shell=${rs.shell}) dropped=${dm} (read=${ds.read} thought=${ds.thought} shell=${ds.shell}) hint=${hint}`;
};
const EXPECT_U1_BRIEF = [
  "session ses_ct_u1",
  "header: marker=msg_u13 summary=msg_u14 tail_start=msg_u07 retained=6 post-summary=4",
  ...u1Window.map((m, i) => u1Row(m, `row: ${i + 1}`)),
  "last: 10",
  u1Option("low", 6),
  u1Option("medium", 3),
  u1Option("high", 0),
  u1Biggest(u1Window, 5),
].join("\n");
const EXPECT_U1_FULL = [
  "session ses_ct_u1",
  "header: marker=msg_u13 summary=msg_u14 tail_start=msg_u07 retained=6 post-summary=4",
  ...u1Window.map((m) => u1Row(m, `row: ${m.id} ${m.time}`)),
].join("\n");

const briefU1 = await reportWindow(FX, "ses_ct_u1", undefined, { brief: true });
chk(
  "U1 brief report byte-exact: the numbered rows 1..10 (tool-target detail only) + last: 10 + the low/medium/high options (messageID anchors + keep + the read/thought/shell split + the one-line hint) + the top-5 biggest list — every mass figure machine-recomputed from the fixture DB",
  briefU1 === EXPECT_U1_BRIEF,
  JSON.stringify(briefU1.split("\n")),
);
const fullU1 = await reportWindow(FX, "ses_ct_u1");
chk(
  "U1 full form byte-identical: the core reportWindow without opts keeps the pre-U1 shape (id + time per row, no last/options/biggest)",
  fullU1 === EXPECT_U1_FULL && fullU1 !== briefU1,
  JSON.stringify(fullU1.split("\n")),
);
const dbU1 = gauge.getDbPath();
gauge.setDbPath(FX); // steer the tool surface at the fixture (restored after)
{
  const surfBrief = await surf.execute({ mode: "report", session: "ses_ct_u1" }, {});
  chk(
    "U1 surface default = the cut-down form (the tool() report byte-exact to the core brief)",
    surfBrief === EXPECT_U1_BRIEF && surfBrief.split("\n")[2] === u1Row(u1Window[0], "row: 1"),
    JSON.stringify(surfBrief.split("\n").slice(0, 4)),
  );
}
{
  const surfDry = await surf.execute({ mode: "report", session: "ses_ct_u1", target: "msg_u05" }, {});
  const keepMass = u1Msgs.slice(4, 12).reduce((a, m) => a + u1Mass(m), 0);
  chk(
    "U1 surface brief dry-run (target msg_u05): the exact remove/keep line (machine-recomputed keepMass) + verdict=ok",
    surfDry.endsWith(`dry-run: target=msg_u05 remove=0 (0 tokens) keep=8 (${keepMass} tokens) verdict=ok`),
    JSON.stringify(surfDry.split("\n").slice(-1)),
  );
}
{
  const nmMsgs = u1Load("ses_ct_nomark");
  const EXPECT_NM = [
    "session ses_ct_nomark",
    "header: marker=none summary=none tail_start=none retained=0 post-summary=0 window=full-history",
    ...nmMsgs.map((m, i) => u1Row(m, `row: ${i + 1}`)),
    "last: 3",
    u1Biggest(nmMsgs, 5),
  ].join("\n");
  const nomark = await surf.execute({ mode: "report", session: "ses_ct_nomark" }, {});
  chk(
    "U1 no-marker brief: no option block (no completed compaction) + the biggest single finished turn + last: 3",
    nomark === EXPECT_NM && !nomark.split("\n").some((l) => l.startsWith("option ")),
    JSON.stringify(nomark.split("\n")),
  );
}
{
  const top3 = await reportWindow(FX, "ses_ct_u1", undefined, { brief: true, top: 3 });
  chk(
    "U1 core top=3: the biggest list trims to the top-3 (machine-recomputed masses)",
    top3.endsWith(u1Biggest(u1Window, 3)) && top3.split("\n").length === EXPECT_U1_BRIEF.split("\n").length,
    JSON.stringify(top3.split("\n").slice(-1)),
  );
}
gauge.setDbPath(dbU1); // restore the original db path

rmTear(SANDBOX, { recursive: true, force: true }); // #144 retry-on-EBUSY
finish();
