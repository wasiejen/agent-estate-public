POST-TRIM RE-APPLICATION — read this first when a drop landed.

A context trim dropped completed tool-output rows from your assembled
request. Your instructions and newest step stay. Nothing was summarized:
dropped rows leave no replacement text — the gap IS the drop.
AGENTS.md §Context Trim is the authority for the lanes; do not restate or
re-plan from memory what it defines.

WHAT HAPPENED:
- The provider request shrank; stored history is untouched until the store
  entry is cleared. Drops are reversible, but the lane matters: `unmark`
  removes STAGED rows PRE-APPLY only; an applied (`active`) or `free`/guard
  (`auto`) id clears only via `mode:'mark' clear:true`, which empties all
  drop sets. There is no un-apply for a single row.
- Dropped content is recoverable ONLY from committed files.

STEPS — do them in ONE batch:
1. Re-read your role's state files: the task spec
   (`agent/handover/handover_task.md`) + your summary
   (`handover_task_to_planner.md`) for worker/explorer; the NAP
   (`handover_planner.md`) for the planner; plus `TODO.md`.
2. Re-read the committed instruction files you had read earlier — the
   `agent/readme/**` parts and project docs are OUT of context. `git log`
   shows what is committed; a path that fails to read goes in your
   handover, then continue.
3. If your in-context working state is gone: write a short self-summary
   file under `agent/handover/`, commit it, continue from it.
4. Continue the current task from committed state — do not re-plan.
   Committed files beat any recollection.
5. Judge what was dropped from `context_trim mode:'report'` flags + the
   trim log — never from memory.
6. Run the gauge (`ctx_gauge`, `repo_commands.md`) before starting new
   work — the readout reflects the trimmed request and still lags one
   step.

Then continue the current task.
