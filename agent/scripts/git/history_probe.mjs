#!/usr/bin/env node
// history_probe.mjs — search string -> commits -> old text of the string, in
// ONE call. READ-ONLY git: `log --all -S`, `show --name-only`, `show <sha>:<path>`.
// No pager, no network, bounded output. (#237)
//
// Usage: node agent/scripts/git/history_probe.mjs <string> [--max N] [--paths a,b]
//   <string>      pickaxe search string (argv[2], literal substring match)
//   --max N       cap the printed hit list (default 10)
//   --paths LIST  comma- or space-separated paths to scope the search
//                 (default: opencode.jsonc, .opencode/opencode.jsonc)
import { execFileSync } from "node:child_process";

const DEFAULT_PATHS = ["opencode.jsonc", ".opencode/opencode.jsonc"];
const MAX_MATCH_LINES = 20; // per commit
const MAX_FILES = 12; // per commit
const LINE_WIDTH = 200; // per printed line

function parseArgs(argv) {
  const args = argv.slice(2);
  let str = null;
  let max = 10;
  let paths = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--max" || a === "-n") max = parseInt(args[++i], 10) || 10;
    else if (a.startsWith("--max=")) max = parseInt(a.slice(6), 10) || 10;
    else if (a === "--paths") {
      paths = [];
      while (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        paths.push(...args[++i].split(",").map((s) => s.trim()).filter(Boolean));
      }
    } else if (a.startsWith("--paths=")) {
      paths = a.slice(8).split(",").map((s) => s.trim()).filter(Boolean);
    } else if (str === null) str = a;
  }
  if (!str) {
    console.log("usage: node agent/scripts/git/history_probe.mjs <string> [--max N] [--paths a,b]");
    process.exit(2);
  }
  return { str, max: Math.max(1, max), paths: paths && paths.length ? paths : DEFAULT_PATHS };
}

// READ-ONLY git call. Never a pager: --no-pager + GIT_PAGER=cat.
function git(args) {
  try {
    const out = execFileSync("git", ["--no-pager", ...args], {
      encoding: "utf8",
      env: { ...process.env, GIT_PAGER: "cat", GIT_TERMINAL_PROMPT: "0" },
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 8 * 1024 * 1024,
    });
    return { ok: true, out };
  } catch (e) {
    // a missing blob/path at that commit is expected -> no match, not an error
    return { ok: false, out: String(e.message || "").trim() };
  }
}

const clip = (line) => (line.length > LINE_WIDTH ? line.slice(0, LINE_WIDTH) + "…" : line);

function main() {
  const { str, max, paths } = parseArgs(process.argv);
  console.log(`history_probe: string="${str}"  paths=${paths.join(", ")}  max=${max}`);

  const logRes = git(["log", "--all", "--oneline", `-S${str}`, "--", ...paths]);
  if (!logRes.ok) {
    console.log(`git log failed: ${logRes.out.split("\n")[0] || "unknown error"}`);
    process.exit(1);
  }
  const hits = logRes.out.split("\n").filter((l) => l.trim());
  if (!hits.length) {
    console.log("hits: 0 — string never changed count in the scoped paths");
    return;
  }
  console.log(`hits: ${hits.length} commit(s) shown ${Math.min(max, hits.length)}`);

  let shown = 0;
  for (const hitLine of hits) {
    if (shown >= max) {
      console.log(`… ${hits.length - shown} more hit(s) withheld (--max ${max})`);
      break;
    }
    shown++;
    const spaceAt = hitLine.indexOf(" ");
    const sha = spaceAt < 0 ? hitLine : hitLine.slice(0, spaceAt);
    const subject = spaceAt < 0 ? "" : hitLine.slice(spaceAt + 1);
    console.log(`\n== hit ${shown}/${hits.length} ==`);
    console.log(`sha: ${sha}  subject: ${clip(subject)}`);

    const filesRes = git(["show", "--name-only", "--pretty=format:", sha]);
    const files = filesRes.ok ? filesRes.out.split("\n").map((f) => f.trim()).filter(Boolean) : [];
    const listed = files.slice(0, MAX_FILES);
    console.log(`touched files: ${listed.length ? listed.join(", ") : "(none reported)"}${files.length > MAX_FILES ? ` +${files.length - MAX_FILES} more` : ""}`);

    let printed = 0;
    // the commit itself first; if it REMOVED the text, fall back to the parent
    for (const asOf of [sha, `${sha}^`]) {
      if (printed) break;
      const label = asOf === sha ? "" : " as of parent (text this commit removed)";
      for (const path of paths) {
        if (printed >= MAX_MATCH_LINES) break;
        const blobRes = git(["show", `${asOf}:${path}`]);
        if (!blobRes.ok) continue;
        const matched = blobRes.out
          .split("\n")
          .map((line, i) => ({ n: i + 1, line }))
          .filter((m) => m.line.includes(str));
        if (!matched.length) continue;
        console.log(`matched lines in ${path} @ ${sha}${label}:`);
        for (const m of matched) {
          if (printed >= MAX_MATCH_LINES) {
            console.log(`  … capped at ${MAX_MATCH_LINES} matched lines for this commit`);
            break;
          }
          printed++;
          console.log(`  ${m.n}: ${clip(m.line)}`);
        }
      }
    }
    if (!printed) console.log("matched lines: none in the scoped paths at this commit or its parent");
  }
}

main();
