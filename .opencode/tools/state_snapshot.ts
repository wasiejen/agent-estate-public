// state_snapshot.ts — the planner's 6–8-call init sequence as ONE capped,
// deterministic digest (approved proposal:
// proposals/approved/2026-09-18_p3-state-snapshot-tool.md; spec
// agent/handover/handover_task.md). The host auto-detects
// .opencode/tools/*.ts (the plan39 precedent) — NO registration anywhere;
// the maintainer confirmed per-role config is not needed.
//
// The digest is READ-ONLY: it reads the repo state (git log, NAP, TODO.md,
// the maintainer inbox/priority, proposals/, the marker sweep) and NEVER
// writes anywhere. The marker sweep is the READY-MADE command from the
// planner prompt §maintainer calls/decisions, run verbatim via bash —
// do NOT re-derive the pattern list (`--main` matches `--maintainer` too,
// `--defer` matches `--deferred` too; the grep -v filter removes known
// non-live references, not the maintainer's live files).
//
// The sweep command itself stays byte-verbatim; only its OUTPUT is re-ordered
// in `markersSection`: LIVE-CLASS hits (paths under maintainer/ or .opencode/,
// or exactly TODO.md / README.md / WIKI.md) print BEFORE the DOC-CLASS hits.
//
// No interpretation, no re-planning: the digest is a raw, capped view —
// the planner follows up with full reads only where a section needs a
// decision.
import { tool } from "@opencode-ai/plugin"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

// The ready-made marker sweep (planner prompt §maintainer calls/decisions —
// verbatim). `2>/dev/null` keeps missing target files (README.md / WIKI.md /
// absent dirs) from poisoning the output.
const MARKER_SWEEP = `grep -rn --include="*.md" -e "--main\\|--now\\|--info\\|--todo\\|--defer\\|--wip\\|--comment" \\
  .opencode/ agent/ maintainer/ loop/ proposals/ TODO.md README.md WIKI.md 2>/dev/null \\
  | grep -v "_past_priorities\\|/done/\\|agent_feedback\\|nap_direct\\|archive/"`

// Read a file's lines (a single trailing newline dropped); null on any
// read failure (the fail-closed section lines are built on this).
const fileLines = (p: string): string[] | null => {
  try {
    let text = fs.readFileSync(p, "utf8")
    if (text.endsWith("\n")) text = text.slice(0, -1)
    return text.split(/\r?\n/)
  } catch {
    return null
  }
}

// Trim + hard truncate to n chars (no ellipsis — the caps are line counts
// and char caps, not prose).
const trunc = (s: string, n: number): string => {
  const t = s.trim()
  return t.length > n ? t.slice(0, n) : t
}

// The first error line (the child's stderr when it carries text — the
// informative line — else the thrown message), capped to 80 chars.
const firstErrorLine = (e: any): string => {
  const text = typeof e?.stderr === "string" && e.stderr.trim() !== "" ? e.stderr : String(e?.message ?? "unknown error")
  return text.trim().split("\n")[0].slice(0, 80)
}

// `## git` — git log --oneline -20 (execFileSync, args array; on failure
// the line `(git log failed: <first error line, 80 chars>)`).
const gitSection = (root: string): string[] => {
  try {
    const out = execFileSync("git", ["log", "--oneline", "-20"], { cwd: root, encoding: "utf8" })
    const lines = out.split("\n").map((l) => l.trim()).filter((l) => l !== "")
    return lines.length > 0 ? lines : ["(none)"]
  } catch (e: any) {
    return [`(git log failed: ${firstErrorLine(e)})`]
  }
}

// `## nap` — the FIRST 40 lines of agent/handover/handover_planner.md;
// > 40 lines → the steer line; missing → the fail-closed line.
const napSection = (root: string): string[] => {
  const rel = "agent/handover/handover_planner.md"
  const lines = fileLines(path.join(root, rel))
  if (lines === null) return [`(nap missing: ${rel})`]
  const body = lines.slice(0, 40)
  if (lines.length > 40) body.push(`… (read ${rel} for the rest)`)
  return body.length > 0 ? body : ["(none)"]
}

// `## todo` — entry headers = lines matching `^## (?:#\d+|\d+)\.` in
// TODO.md; the count of ALL of them on the first line, then the LAST 15
// headers, one per line: `#<id> — <remainder truncated to 60 chars>`
// (file order).
const todoSection = (root: string): string[] => {
  const lines = fileLines(path.join(root, "TODO.md")) ?? []
  const headers: { id: string; rest: string }[] = []
  for (const line of lines) {
    const m = line.match(/^## (?:#(\d+)|(\d+))\.\s*(.*)$/)
    if (m) headers.push({ id: m[1] ?? m[2], rest: (m[3] ?? "").trim() })
  }
  const out = [`${headers.length} open-entry headers`]
  for (const h of headers.slice(-15)) out.push(`#${h.id} — ${trunc(h.rest, 60)}`)
  return out
}

// `## maintainer` — for each .md file in maintainer/inbox_planner/
// (excluding README.md): `<filename>: <first line truncated to 80 chars>`
// (max 5 files, then `… (+<k> more)`); then priority.md: its first 10
// lines. No inbox files → `(none)`; priority missing → the fail-closed
// line.
const maintainerSection = (root: string): string[] => {
  const inboxDir = path.join(root, "maintainer", "inbox_planner")
  const files: string[] = []
  try {
    for (const name of fs.readdirSync(inboxDir)) {
      if (name.toLowerCase().endsWith(".md") && name !== "README.md") files.push(name)
    }
    files.sort()
  } catch {}
  const out: string[] = []
  if (files.length === 0) {
    out.push("(none)")
  } else {
    for (const name of files.slice(0, 5)) {
      const first = (fileLines(path.join(inboxDir, name)) ?? [""])[0]
      out.push(`${name}: ${trunc(first, 80)}`)
    }
    if (files.length > 5) out.push(`… (+${files.length - 5} more)`)
  }
  const prio = fileLines(path.join(root, "maintainer", "priority.md"))
  if (prio === null) out.push("(priority.md missing)")
  else out.push(...prio.slice(0, 10))
  return out
}

// `## proposals` — the .md FILENAMES at proposals/ root (files only, no
// subfolders), one per line (sorted); none → `(none)`.
const proposalsSection = (root: string): string[] => {
  const dir = path.join(root, "proposals")
  const files: string[] = []
  try {
    for (const name of fs.readdirSync(dir)) {
      if (name.toLowerCase().endsWith(".md") && fs.statSync(path.join(dir, name)).isFile()) files.push(name)
    }
    files.sort()
  } catch {}
  return files.length > 0 ? files : ["(none)"]
}

// A sweep hit's CLASS: the PATH (grep's `<path>:<line>:<content>` form —
// the text before the first `:`). LIVE-CLASS = under `maintainer/` or
// `.opencode/`, or exactly `TODO.md` / `README.md` / `WIKI.md`; every other
// path (agent/, loop/, proposals/, …) is DOC-CLASS.
const isLiveHit = (line: string): boolean => {
  const i = line.indexOf(":")
  const p = i >= 0 ? line.slice(0, i) : line
  return p.startsWith("maintainer/") || p.startsWith(".opencode/") || p === "TODO.md" || p === "README.md" || p === "WIKI.md"
}

// `## markers` — the ready-made marker sweep run verbatim via bash in the
// repo root; the hits are reordered LIVE-CLASS first, then DOC-CLASS, each
// group sorted by the line string (the raw sweep order is the sweep's path
// ARGUMENT order, where the agent/ DOC hits print first and can crowd the
// live maintainer/TODO markers out of the window); then capped at 20 lines
// (then `… (+<k> more)`); no matches → `(none)`; bash failure → the fail-closed
// line.
const markersSection = (root: string): string[] => {
  let out = ""
  try {
    out = execFileSync("bash", ["-c", MARKER_SWEEP], { cwd: root, encoding: "utf8" })
  } catch (e: any) {
    // grep exits 1 on NO MATCHES (empty stdout) — that is an empty sweep,
    // not a failure (the fail-closed line is only for a real error).
    if (e?.status === 1 && (e?.stdout ?? "") === "" && (e?.stderr ?? "") === "") {
      out = ""
    } else {
      return [`(marker sweep failed: ${firstErrorLine(e)})`]
    }
  }
  const lines = out.split("\n").map((l) => l.trim()).filter((l) => l !== "")
  if (lines.length === 0) return ["(none)"]
  // LIVE-CLASS first, then DOC-CLASS, each group sorted by the line string
  // (deterministic; the raw sweep order is the sweep's path ARGUMENT order,
  // which prints the DOC-heavy agent/ hits before the live maintainer/TODO
  // ones). The 20-line cap + steer apply AFTER the ordering.
  const live: string[] = []
  const doc: string[] = []
  for (const l of lines) (isLiveHit(l) ? live : doc).push(l)
  live.sort()
  doc.sort()
  const ordered = live.concat(doc)
  const body = ordered.slice(0, 20)
  if (ordered.length > 20) body.push(`… (+${ordered.length - 20} more)`)
  return body
}

// Assemble the digest: the six sections IN ORDER, each under its
// `## <name>` header, then the total hard cap ~60 lines: truncate the
// LAST section's lines first (content lines only, from the end backwards)
// preserving all six headers + their `… (…)` steer lines.
const buildDigest = (root: string): string => {
  const sections: [string, string[]][] = [
    ["git", gitSection(root)],
    ["nap", napSection(root)],
    ["todo", todoSection(root)],
    ["maintainer", maintainerSection(root)],
    ["proposals", proposalsSection(root)],
    ["markers", markersSection(root)],
  ]
  const digest: string[] = []
  for (const [name, body] of sections) {
    digest.push(`## ${name}`)
    digest.push(...body)
  }
  while (digest.length > 60) {
    let i = digest.length - 1
    while (i >= 0 && (digest[i].startsWith("## ") || digest[i].startsWith("… ("))) i--
    if (i < 0) break
    digest.splice(i, 1)
  }
  return digest.join("\n")
}

export default tool({
  description: `The planner's init digest — the 6–8-call session-start sequence as ONE capped, deterministic read (no interpretation). Sections IN ORDER: \`## git\` (git log --oneline -20), \`## nap\` (the first 40 lines of agent/handover/handover_planner.md + a read-more steer when truncated), \`## todo\` (the TODO.md open-entry header count + the LAST 15 headers), \`## maintainer\` (the maintainer/inbox_planner/ .md files — first line each, max 5 — + priority.md's first 10 lines), \`## proposals\` (the proposals/ root .md filenames), \`## markers\` (the ready-made marker sweep, capped at 20 lines). Empty sections read \`(none)\`; the whole digest is hard-capped at 60 lines (the LAST section's lines truncate first, all six headers + their steers are preserved). PLANNER ONLY — a non-planner agent gets the one-line refusal instead of the digest. Fire at session start; follow up with full reads only where a section needs a decision.`,
  args: {},

  execute: async (_args: any, context: any) => {
    // The soft role gate: a non-empty agent that is not a planner gets the
    // exact one-line refusal (no digest, no throw).
    const agent = typeof context?.agent === "string" ? context.agent : ""
    if (agent !== "" && !agent.startsWith("planner")) {
      return `state_snapshot is the planner init digest — not for ${agent}`
    }
    // The repo root: the custom-tool context carries `directory` (verified
    // live — see the spec's verified facts); fallback process.cwd().
    const root = typeof context?.directory === "string" && context.directory !== "" ? context.directory : process.cwd()
    return buildDigest(root)
  }
})
