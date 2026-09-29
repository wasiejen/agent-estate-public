# context-trim tool: surgically shrink a live session's model context (2026-09-28, planner-37)

## Overview

A new agent-facing tool (`.opencode/tools/context_trim.ts`, registered in
`opencode.jsonc` — your domain) that reduces the model context of a live
session WITHOUT compaction, by writing to the live opencode DB
(`~/.local/share/opencode/opencode.db` — the gauge's `DEFAULT_DB_PATH`,
`.opencode/plugin/scripts/gauge.mjs` L157, existing path resolution reused).

Evidence base: the research doc
`.opencode/agent/research/2026-09-28_context-erase-tail-trim.md`
(explorer-36, plan36 unit 1): the model context is re-derived from the DB at
the top of EVERY loop step (prompt.ts:1092 `filterCompactedEffect` → fresh
SQL select message-v2.ts:433-446 → toModelMessagesEffect → llm.stream) —
no in-memory history, no prompt cache. A DB write therefore changes the next
prompt with zero restart, zero invalidation, zero host cooperation.

## The two levers (research doc §5)

1. **tail** (preferred, non-destructive): rewrite the compaction part's
   `tail_start_id` — the host does exactly this itself on compaction
   (compaction.ts:461-466). One JSON field on one part row trims or extends
   the retained tail precisely (`result.slice(tailIndex, compactionIndex)`,
   message-v2.ts:567-571). Reversible (point it back at the old id). Only
   usable when a compaction marker exists.
2. **turns** (destructive): delete complete finished old turns (user row +
   its assistant rows; parts cascade via FK, `PRAGMA foreign_keys = ON`)
   strictly BEFORE the current last user message and strictly OUTSIDE the
   compaction-marker quartet (compaction user row + compaction part +
   summary row + `tail_start_id` target). The only lever for sessions with
   NO marker.

## Proposed surface

- `report <session> <target>` — DRY RUN (default mode): what a trim to the
  target would remove (message count + token mass via the gauge's S metric
  or bytes/4 fallback) and what would remain; no write.
- `tail <session> <messageID>` — apply the `tail_start_id` rewrite after
  validating the id exists, sits before the compaction user row, and keeps
  the window guard (message-v2.ts:568) satisfiable; single transaction.
- `turns <session> <target|count>` — apply the old-turn deletions after
  validating every row against the safe-zone rules (no last user message,
  no quartet, no in-flight rows); single transaction.

Validation mirrors the window guard exactly; fail-closed on any doubt.
WAL coordination: a brief write lock; the host reads on its own connection
(SQLite WAL = concurrent read, single writer).

## Hazards (research doc §4-5)

- Deleting the last user message makes the next prompt re-run the OLDEST
  surviving user turn (MessageV2.latest, message-v2.ts:586-602).
- Deleting ANY marker-quartet member degenerates the window to the FULL
  history → overflow, and this host has NO auto-compact backstop
  (`compaction.auto = false`).
- Row surgery near the session tail or the marker is structurally load-bearing.
- `turns` is irreversible (the pre-compaction dumps only cover compacted
  sessions).

## Effort

- Tool ~150-250 lines + DB write coordination; smokes against a FIXTURE DB
  (never the live one); probe pins per the established pattern; registration
  in `opencode.jsonc` (you); live acceptance on a dedicated throwaway session
  (report first, never trim a working session blind).
- ~0.5-1 day worker time (one unit) + one post-restart live-acceptance cycle.

## Approval needed

Live-DB writes + a new tool surface = observable behavior change → your
call. The specific question: is a `turns` (row-deletion) mode wanted, or
only `report` + `tail`?

## Recommendation

Build `report` + `tail` first (non-destructive, reversible, validation
against the host's own guard semantics), and keep `turns` as a follow-up
until a `report` run shows real savings in a long never-compacted session.
If you want no live-DB write tool at all: the research doc stands as the
evidence record, no code needed.

comment 2026-09-29_19-15: (replace "--comment" with just "comment" on read and acted on it - to not let the maintainer search be uncomment - that you can see as a general ruling and would need to be updated whereever the concention for this stands. only apply this instead of removing the comment to all documents that document the development/history or idea exchange)

mh so the tail approach in general does exactly the same as the compaction - setting a marker from which the tail will start to load, but which only functions when a compaction marker is there? did i understand that correctly? so we could use it to customize our compaction not based on keepToken (which is not working due to non exposure of this function) but on real keepMessages. we could, after the compaction and before the prefill, set the marker to the keepMessages of compact_memory indicated position and thus keep the tail we want to keep.

and i would prefer not to do any destructive measures on the DB in general.

we have a fork of opencode in the:
"opencode": {
  "path": "home/Repos/opencode",
  "description": "forked opencode repo"
}
and could thus customize the message pruning idea. why not change the way the current context "gathering" does. so instead of, using the full session in db and when a compaction was done the marker to indicate the start of the tail from which on to built the context of, we could have our own json or marker file that is the base of the context built up in which each message has an entry, a number, tool, #token, #token to current "tailhead" and a toggle to turn on and off (message-state-list). and we assemple the context based on this json file or equivalent in-memory state? so we could write a tool to manage this message-state-list and to modify this instead of the DB. and on removing a message we just toggle it of and it will no longer be built into the context. on compaction we could just overwrite the marker for the tail_start_id with the appropiate placement of our keepMessage of our compact_memory tool or completely replace it via the message-state-list and turn off all previous messages.
- would need a map or peek functionality to let the agent know what is in the current context and to decide what to drop.
- we could also complety remove compaction as a seperate tool and only use the pruning of messages: before a self-prune the agent would get the instruction to create the summery for himself (no loading times of the compaction agent and also reduced cache usage because this compaction model would never run)


see agent\research\2026-09-28_keeptokens-fork-effort.md for the current idea on how to change the fork to make a simpler version of tail of it but with less control.

but no idea how exactly after changing the fork i can create the bun exe opencode is actually running on.
- so feedback to this please

## Feedback (2026-09-29, planner, direct session ses_f11b625d3ffeio02fDzjzypbN2)

Answering the 19-15 comment, point by point. Line refs verified against the
1.18.32 dev tree (the #99/#105 research provenance); the fork itself reads
**1.18.33** (measured today — re-grep refs at apply time, possible 1-line drift).

### Q1 — "does the tail approach do exactly the same as compaction?"
Yes — your understanding is correct, verified in source: the context builder
(`message-v2.ts` `toModelMessagesEffect`) finds the LAST compaction part that
carries a `tail_start_id` (L549-556) and builds the model context as
[history up to the summary] + `slice(tailIndex, compactionIndex)` — and that
slice only applies when the guard (L568) passes, i.e. ONLY when a compaction
marker with `tail_start_id` exists. No compaction marker → no tail slicing at
all (full history loads — which is exactly why a no-marker session would have
needed the row-deletion `turns` lever, which you ruled out). The tail lever
is compaction-only by design, and it rewrites the SAME single JSON field the
host writes itself during compaction (compaction.ts:461-466).

### Q2 — "customize our compaction on real keepMessages, not keepToken"
Feasible plugin-side, ZERO fork — and I consider it the best use of the lever:
- `compact_memory` already computes the keepMessages window (the S-diff
  metric, #99/#106 work). The host's summarize request only resolves AFTER
  the host has written the compaction part + summary + its own `tail_start_id`
  into the DB. Our plugin then rewrites `tail_start_id` to the FIRST message
  ID of the keepMessages window — before the next step's prefill.
- No race, no restart: the host re-reads the DB fresh at the top of EVERY loop
  step (verified: prompt.ts:1092 → fresh SQL select → toModelMessagesEffect →
  llm.stream; no in-memory history) — the next prefill uses the rewritten tail.
- It replaces the host's token-budget semantics (consume whole turns until the
  configured 40k budget runs out) with EXACT count-based retention: exactly
  the last keepMessages messages, no more, no less.
- Validation (fail-closed, mirroring the host's own window guard): the rewritten
  ID must exist in the session, sit strictly BEFORE the compaction user row,
  and leave the summary after it — otherwise the window degenerates to the
  FULL history → overflow, and this host has NO auto-compact backstop
  (`compaction.auto = false`). WAL coordination: a brief write lock; the host
  reads on its own connection (same as the proposal's `tail` mode).
- Semantics recommendation: explicit exact-retention (bidirectional — extend
  OR shorten the host's tail to the keepMessages boundary), logged
  (`tail= old→new`). Shortening is your intent (control over what stays);
  the validation protects against the degenerate write.

Consequence: with this landed, the ~11-line fork keepTokens wire becomes
OPTIONAL/redundant for OUR use case — same goal, zero fork, zero rebuild, zero
npm-pinning. The fork doc stays as the fallback (it would also give any client
a native per-call keep field).

### The message-state-list fork idea
- Feasibility re-frame: the minimal fork is NOT a redesign of context
  gathering — it is a POST-FILTER on the already-fetched messages (inside /
  just before `toModelMessagesEffect`): when a session's state list exists,
  drop the toggled-off messages before the model context is built; the DB rows
  are never touched (non-destructive in the DB sense — matches your no-
  destructive ruling). Divergence concentrated in one function + list-file IO,
  comparable in size to the 11-line wire, not to a rewrite.
- Real costs to weigh: (a) a SECOND source of truth for "what is in context"
  (TUI/DB views still show the full history; only the model context follows
  the list) — fine for agent-centric use, confusing for manual inspection;
  (b) the safe-zone rules carry over verbatim: toggling off ANY compaction-
  quartet member degenerates the window to full history (overflow, no
  backstop); toggling off the LAST user message makes the next prompt re-run
  the oldest surviving user turn (message-v2.ts L586-602); the list must be
  validated against the live DB each build (rows may have vanished);
  (c) every upstream update re-lands the filter + rebuild + swap (the npm-
  overwrite discipline of the fork-effort doc §3-4).
- The map/peek you want ("what is in the current context") needs NO fork: a
  read-only report derived from the DB (per-message id + token mass + in/out
  of the current window per marker/tail + which messages a toggle would drop)
  = the proposed `report` mode, extended. Cheap — build it first.
- Self-prune + self-summary (rem 
  the state list is proven.

### "How do I make the bun exe after changing the fork?"
Documented in `agent/research/2026-09-28_keeptokens-fork-effort.md` §3 — the
maintainer build+swap commands (I did not run them):
1. `bun install` (one-time, full workspace; bun 1.3.x — the tree declares
   `packageManager: bun@1.3.14`),
2. `bun run --cwd packages/opencode build --single` (optionally
   `--skip-embed-web-ui` — the web UI is unused on this host),
3. smoke: `dist/opencode-windows-x64/bin/opencode --version` → expect the fork
   version (bump `packages/opencode/package.json` to e.g. `1.18.33-fork.1`
   for traceability),
4. swap: overwrite `AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`
   AND both platform twins (`opencode-windows-x64` + `-baseline`) so a later
   npm postinstall cannot silently restore upstream,
5. restart.
Caveat: the fork's `packages/opencode/package.json` reads **1.18.33** while
the installed host is **1.18.32** — the research doc's line refs were
verified against 1.18.32; re-grep at apply time (possible 1-line drift).

### Proposed order (my recommendation)
1. `report` + `tail` (the proposal's own recommendation — non-destructive,
   reversible; the report doubles as the "what's in my context" peek),
2. the plugin-side post-compaction tail-set (Q2 — zero fork, exact
   keepMessages retention),
3. only if (1)+(2) show a real need for per-message toggling: the state-list
   post-filter fork (+ its map/peek surface),
4. the 11-line fork wire only if you want the host-native field itself.


--wip
comment:
- "host has NO auto-compact backstop (`compaction.auto = false`)" - we have a auto compact backstop with the plugin recovery_context which triggers on context limit violation. thus we might trigger a second compaction if the tail_start_id is wrongly set.
  - and honestly if we can apply the message-state-list then we do not need compaction as as safety net anymore - we could just wire in the removal of some big tool output (e.g. biggest tool output first and min 30k for example) and thus free up enough room to do a proper message-state-list trigger with self-summery
    - reloading the compaction model or reloading the thus changed context is not so much different
- "Semantics recommendation: explicit exact-retention" yes - it should be truthful in its working. but for security or to prevent wrong inputs is may best to not allow very low keepMessages like 1,2 or 3 .. maybe 6 and state that explicitly in the descirption (so it is truthful)
- "Real costs to weigh: (a)" - the TUI still shows most of the messages. but would be better if all to just have a clear log of earlier messages. so would be a small feature not a detriment
- "- Self-prune + self-summary" of course keep it - this is an idea not an instruction or concrete plan. there are 28 thousend

to your concern because of update and reapplying the changes:
- there are 28 thousend forks currently and who knows how many forks of forks of opencode. i can not imagine that this is not solved in an easy way already. or maybe a non-issue in the first place. on each fetch of the origin i have to do a merge and just move keep out changes. npm install is the only thing i have no idea first why this is a problem and second even less on how to solve this :-)

1. + 2. are approved
3. self-pruning is more a tool to free up space more deliberately before work or after ingesting big tool output. tool output and thoughts that are no longer needed can be dropped when a finished design/draft is ready to be implemented. or for webfetch to summerize the findings and remove after each or couple of webfetches. this makes the cost of compaction way less and preserves the loaded file state like repo specific and readme files. in my eyes way better than the crude drop the head completely and only keep the tail
- and i see the need for model toggling every time the session slows down due to big reads or long thinking blocks that later are only unnecessary weight and make really long sessions potentially viable.
  - this also makes smaller context size on models more viable and let me optimize more on speed instead of using the slow models to have max context size
- also the developement of the dev fork is really shallow and most of the new features will never land on v1 of opencode. thus to just stay with the current version and accasionally update it is ok - does not need to be up to date without mayor fixed errors.
- AND i also want to see how well this works - to have an own fork :-) (learning opportunity for me)
4. the 11-line is if 2. is working the more cononical way but at the same time unnecessary if 2. works.

the report lookup could also offer the info about what file was read and line markings if possible so the agent know exactly what is in the context and can choose more informed what to drop (addition for 3. if not already planned?)


feedback pls again. no sugarcoating or accomodating pls

## Feedback (2026-09-29, planner, direct session ses_f110d8065ffeCVoCfNeTcba0wU)

Point by point on your 21-11 + 22-28 comments. No sugarcoating:

### 1. "no auto-compact backstop" — your correction is right; my claim was overstated
I was talking about the host-native setting (`compaction.auto = false`). You're right
that context_recovery is the live backstop (live-verified in #93: overflow → recovery
fires → compacts → session continues). So a wrongly-set `tail_start_id` that retains
TOO MUCH → overflow → a second compaction fires. Cost: the first summary's work is
wasted + one re-summarization cycle (~3-4 min) + a fresh marker. Self-healing, not
catastrophic.
One honest caveat: the backstop covers only the overflow direction. The opposite
mistake — retaining too LITTLE — is silent: no overflow, no recovery, the agent just
lost state it needed. So the fail-closed validation (id exists, strictly before the
compaction user row, summary after it, window guard satisfiable) stays the PRIMARY
safety; the backstop is the net for what validation misses in the dangerous direction.
The proposal record gets amended accordingly.

### 2. keepMessages floor — agreed
Min 6, stated in the tool description. It's a code constant + one description line.

### 3. TUI cost (a) — understood; nothing to build here
The TUI already renders the full DB history (your "clear log of earlier messages"
already exists). The only gap is that the TUI shows more than the model sees — you
rate that acceptable / a small feature, not a detriment. I agree there's nothing to
build on this track; a visual "effective window" indicator would be a separate small
feature if you ever want it.

### 4. Self-prune as a deliberate tool — agreed, and it argues for item 3 EARLIER than I gated it
Your use-case sketch (drop big tool outputs — webfetch findings — while preserving
loaded repo/readme state) is exactly what per-message toggling solves. Candid note:
the approved scope (1+2) does NOT cover it at fine granularity. `report` gives the
informed picker (which messages are big, which files/lines); `tail` gives only the
COARSE boundary (everything before it is replaced by the summary). "Drop just this
one webfetch output, keep the rest" needs the state-list fork (item 3). So your
self-prune idea is the strongest argument to promote item 3 from "only if proven
needed" to "planned follow-up". With your own-fork learning motive on top, my order
is now: 1+2 now (approved), 3 next as the learning-fork unit.

### The "28 thousand forks" pushback — you're right, and the npm point was over-flagged
Fork maintenance is normal practice; your workflow (fetch origin → merge → move
keep-out changes → rebuild) is what those 28k forks do — nothing new or hard in it.
The npm point, precisely: the installed host is a global npm install
(`AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe`) and the fork exe is
SWAPPED into that path. The only hazard: a later `npm update opencode-ai` (or
reinstall) silently overwrites the swapped fork with upstream — the fork dies
unnoticed. npm install itself is NOT the problem; npm UPDATE clobbers the swap. And
under the workflow you describe (updates go fork-side: fetch → merge → rebuild →
swap), the concern evaporates entirely. One standing rule: never `npm update` that
package while the fork is in place. So: a non-issue in your workflow, as you say.

### 5. Model toggling — an idea, not buildable now; feasibility hinges on one research question
Candidly, it has three parts: (a) per-session model choice — possible TODAY (sessions
spawn with a chosen agent+model; auto_resume already resolves the identity to
inject); (b) mid-session per-step switching — plausibly feasible: #80's live finding
(2026-09-22) shows the host runs a turn as the agent+model carried in that message's
`info` (the injected turns ran as "build" until the info was fixed) — so a plugin
rewriting the next user message's model before the prefill (the same DB-write
mechanism as the tail lever) would switch the turn's model; the open question is the
exact read point + a clean write moment; (c) the trigger policy ("when the session
slows") — a heuristic over ctx% + measured t/s; there is no clean "slowing" signal
today. Recommendation: queue (b) as a short research pass (one question: where does
the host read the per-step model?) before any build. Interaction to note: if the
state-list fork (item 3) can drop the big outputs, the session may stop being slow in
the first place — the trim lever may beat the model lever for your stated goal
(speed over max-context).

### 6. Shallow dev-fork — factually right; nothing to change
The dev branch is experimental, v1 is stable; staying on 1.18.32/33 with occasional
merges is the right policy for this host. Your fork-as-learning-project motive is
noted and doesn't change the order (it strengthens the case for item 3 as the next
unit).

### 7. Item 4 (the 11-line wire) — dead unless item 2 fails
Agreed with your read: canonical but unnecessary if 2 works. Removed from the active
plan; the fork-effort doc stays as a fallback record only.

### 8. Report with file/line info — not planned; added to the spec
The DB part rows carry the tool-call inputs (`read`: file path + offset/limit;
`bash`: the command; `webfetch`: the URL). The report will list per message: role,
tool, target (file + line range / URL / command), token mass (S metric, bytes/4
fallback). That makes the report directly usable as the picker for your self-prune
use-case.

### Build scope (your "1. + 2. are approved") — what the worker builds
**Unit 1 — `context_trim` tool** (`.opencode/tools/context_trim.ts`):
- `report <session>` — the current effective window (marker present? summary?
  tail_start_id? what's inside/outside) + per-message rows (role, tool, target,
  token mass) + a dry-run of what a tail trim to X would remove/keep.
- `tail <session> <messageID>` — rewrite `tail_start_id` to the boundary;
  fail-closed validation (id exists, strictly before the compaction user row,
  summary after it, window guard satisfiable); logs `tail= old→new`; single
  transaction, WAL write lock. keepMessages floor 6 (point 2), stated in the
  description.
- NO `turns` mode (the destructive lever is ruled out).
- Smokes against a FIXTURE DB (never the live one) + probe pins; registration in
  opencode.jsonc (your domain); live acceptance on a throwaway session (report first).

**Unit 2 — the post-compaction tail-set** (plugin-side, zero fork):
- Trigger: the existing verified channel (the ctx.log `COMPACT` line = the host's
  compaction landed) → read the DB, find the fresh compaction part + its
  `tail_start_id`, compute the keepMessages boundary (the tool's existing count
  metric), rewrite the id; same validation as Unit 1's `tail`; log
  `tail-set= old→new keep=N`.
- The integration point (poll vs inline-after-dispatch) is pinned in the task spec.

**Unit 3 — the state-list post-filter fork** (planned follow-up, NOT in the 1+2 build):
- per-message toggles (non-destructive in the DB), map/peek surface = the extended
  report, safe-zone rules carry over — your learning fork.

### Open questions (ordered by priority)
1. Units 1+2: GO for the task spec + worker launch now — or review the spec first?
2. Unit 3 as the follow-up learning fork — is that ordering agreed?
3. The model-toggle research question (where the host reads the per-step model) —
   queue it, or run it now?


comment:
5. Model toggling 
- i meant static switch to a faster model. not in session model toggling.
(one question: where does the host read the per-step model?) 
- when switching model in a session i just have to select the new model and send a message. when the model arrives on the next idle after a tool call the model and agent are applied. but this causes a complete reprefill -> so not very interesting atm. so the message is the delivery of what agent/model is requested from the backend and stays this way until i send another message with different agent/model. agent and model are seperately setable.
- so not planned or even intented?
  - but nice idea that a model could request to switch to another model. but i think it would defeat the purpose a bit of per message pruning - except he requests a faster model :-)
  - but generally bad for any planner-worker workflow - planner and worker need to be same model to allow fast switching from cache

questions:
1. go :-)
2. agree, let see that the "easy" part works and we have an immediate gain
3. not needed as described above in comment to 5. Model toggling
