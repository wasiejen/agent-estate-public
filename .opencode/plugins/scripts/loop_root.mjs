// loop_root.mjs — the ONE read-only loop-root/counter reader (TODO #164,
// 2026-10-26, worker-38). The `find the sole autorun-* folder + read its
// counter.json` logic existed in FOUR copies (both state_snapshot twins'
// `loopSection(root)`, gauge.mjs's `loopIterationSuffix()`, and loop_log.ts's
// folder locator + `bumpCounter` read). This module is the single source;
// every reader keeps its OWN validation and output form on top of these
// primitives — NO behavior change for any reader.
//
// READ-ONLY — nothing here ever creates or writes a file. NO gauge
// config/window legs (spec #164: the twins may import THIS, never gauge).
//
// Fail-closed rules (carried verbatim from the four call sites):
// - listLoopFolders: an ABSENT loop root (`ENOENT`) → `[]`; any OTHER readdir
//   failure THROWS — each caller's own fail-closed wrapper decides its empty
//   form exactly as before (loop_log propagates; the twins → `no-looprun`;
//   the gauge suffix → `""`).
// - currentLoopFolder: zero folders → null; exactly one → it; several → the
//   MOST-RECENTLY-MODIFIED (mtimeMs, base order name-sorted — the tie order
//   the twins and loop_log used; gauge gains the same determinism).
// - loopCounterPath / readLoopCounter: the counter is read NEVER-CREATED;
//   absent / unreadable / unparseable / non-object (incl. array) → null.
// The counter `looprun`/`n` validation stays per-reader (the twins require
// looprun==folder + integer n; the gauge suffix requires a finite numeric n;
// loop_log's bump requires looprun==folder + finite n + maxN > n).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// The loop-folder prefix (the `autorun-*` naming convention).
const LOOP_PREFIX = "autorun-";

/**
 * The `autorun-*` SUBDIRECTORY names of `loopRoot`, sorted (the deterministic
 * base order). Absent root → `[]`; other readdir errors throw.
 * @param {string} loopRoot
 * @returns {string[]}
 */
export function listLoopFolders(loopRoot) {
  try {
    return readdirSync(loopRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(LOOP_PREFIX))
      .map((e) => e.name)
      .sort();
  } catch (e) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

/**
 * The CURRENT loop folder for `loopRoot`: exactly one `autorun-*` folder → it;
 * several → the most-recently-modified; none → null. `folders` may carry a
 * pre-read `listLoopFolders` result (avoids the double readdir in loop_log).
 * @param {string} loopRoot
 * @param {string[]} [folders]
 * @returns {string | null}
 */
export function currentLoopFolder(loopRoot, folders = listLoopFolders(loopRoot)) {
  if (folders.length === 0) return null;
  if (folders.length === 1) return folders[0];
  return folders
    .map((n) => ({ n, m: statSync(join(loopRoot, n)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0].n;
}

/**
 * The folder's counter file path — the SINGLE `counter.json` literal of the
 * estate (auto_resume's spawn-write leg keeps its own; smokes/probes build
 * fixture files). Never creates it.
 * @param {string} loopRoot
 * @param {string} folder
 * @returns {string}
 */
export function loopCounterPath(loopRoot, folder) {
  return join(loopRoot, folder, "counter.json");
}

/**
 * The parsed counter OBJECT of `loopRoot/<folder>/counter.json` — fail-closed
 * to null on absent / unreadable / unparseable / non-object (incl. array).
 * NEVER creates or writes the file.
 * @param {string} loopRoot
 * @param {string} folder
 * @returns {{ [key: string]: unknown } | null}
 */
export function readLoopCounter(loopRoot, folder) {
  try {
    const data = JSON.parse(readFileSync(loopCounterPath(loopRoot, folder), "utf-8"));
    if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}
