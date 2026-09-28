// repo-split Phase-0 PREP — DRY-RUN extraction plan (prepared 2026-09-28,
// planner-33; research doc `.opencode/agent/research/2026-09-28_repo-split.md` §1/§4).
//
// PURPOSE: list, verify, and print the two-side file plan for the Phase-1
// git-level split (Option A, deferred-move variant):
//   FST repo    <- product files only (§1a)
//   agent repo  <- `.opencode/**` + the agent-side root files (§1b)
//
// GUARD: this script is DRY-RUN ONLY. It performs zero writes — no copies,
// no `git init`, no pin edits. Executing the split (creating repos,
// copying files, editing `opencode.jsonc`) is the MAINTAINER's domain
// (doc §5). Do not add an execute path here without that ruling.
//
// HOW TO RUN: `node .opencode/agent/research/repo-split/extract_dryrun.mjs`
// (root is resolved from the script's own location — cwd-independent).
// Exit 0 = plan verified; exit 1 = a count/coverage check failed (the tree
// changed since the research doc — re-run the doc's inventory first).

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ls = () => execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean);

// The agent-side ROOT files (doc §1b) — everything else non-`.opencode` is product.
const AGENT_ROOT = [
  "opencode.jsonc",
  "AGENTS.md",
  "TODO.md",
  "todo_inbox.md",
  "todo_records.md",
  "SCRATCH_PAD.md",
];
const isAgentRootFile = (f) =>
  AGENT_ROOT.includes(f) ||
  /^export-planner-session-.+\.md$/.test(f) ||
  /^export-worker.+session-.+\.md$/.test(f);

const files = ls();
const agent = [];
const product = [];
for (const f of files) {
  if (f.startsWith(".opencode/") || (f === f.split("/")[0] && isAgentRootFile(f))) agent.push(f);
  else product.push(f);
}

const byPrefix = (list, p) => list.filter((f) => f.startsWith(p)).length;

// Expected totals from the research doc (2026-09-28, HEAD b9e75cf era):
// tracked total 808 = 739 under .opencode/ + 69 at the root;
// root agent side ≈ 9-10 (6 named + 3 exports), root product ≈ 59-60.
const errors = [];
const dotCount = byPrefix(agent, ".opencode/");
const rootAgent = agent.length - dotCount;
if (files.length !== dotCount + rootAgent + product.length) errors.push("partition does not cover the tracked set");
if (new Set(agent).size !== agent.length || agent.some((f) => product.includes(f))) errors.push("overlap between the two sides");
console.log(`root: ${ROOT}`);
console.log(`tracked total: ${files.length} (doc expected 808)`);
console.log(`agent side:  ${agent.length}  (.opencode/ ${dotCount} + root ${rootAgent})  (doc expected 739 + 9-10)`);
console.log(`product side: ${product.length}  (doc expected 69 at root incl. subdirs)`);
if (dotCount > 900 || dotCount < 700) errors.push(`.opencode count ${dotCount} far from the doc's 739 — inventory drifted`);

const sample = (list, n) => list.slice(0, n).join("\n  ");
console.log(`\nagent root files:\n  ${agent.filter((f) => !f.startsWith(".opencode/")).join("\n  ")}`);
console.log(`\nproduct sample (first 15):\n  ${sample(product, 15)}`);

// Ignored/untracked runtime that a naive copy would lose (doc §4 risk 3) —
// listed for the maintainer's rebuild step, NOT copied by any future execute
// path. (`git status --porcelain` would show none of these — they are
// git-IGNORED, not merely untracked — hence the --ignored flag.)
const ignored = execFileSync("git", ["ls-files", "--others", "--ignored", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean)
  .filter((f) => /^\.venv\//.test(f) || /^\.opencode\/(node_modules|package\.json|package-lock\.json|bun\.lock|plugin\.log|temp)\//.test(f) || /^(node_modules|__pycache__|fst\.log|coverage|\.pytest_cache)/.test(f));
console.log(`\nignored runtime (rebuild, not copy): ${ignored.length} paths (doc §1 list) — first 10:\n  ${sample(ignored, 10)}`);

// Pin diff (doc §2/§4) — what a Phase-1 execution must edit; printed, not applied:
console.log(`
PIN DIFF (execution checklist — NOT applied by this script):
  1. opencode.jsonc:26  external_directory: point at the NEW FST repo path
  2. opencode.jsonc     add a references.fst entry at the NEW FST repo path (pin #3 mechanism)
  3. .opencode/agent/prompts/repo/repo_commands.md:36  scratchpad path wording (only if it moves)
  4. .opencode/agent/prompts/repo/repo_opencode.md:8   npm path wording (only if it moves)
  5. AGENTS.md / repo_overview.md layout wording (only if the physical move happens — Phase 2)
  NO plugin/** or tools/** code changes (pin #5 takeaway: everything resolves from context.directory)
  keep: opencode.jsonc:28 allow-list entry for the session-log dir (pin #8 risk 4)
`);

if (errors.length) { console.error("PLAN CHECK FAILED:\n  " + errors.join("\n  ")); process.exit(1); }
console.log("DRY-RUN OK — plan verified read-only. Execution is the maintainer's domain (doc §5).");
