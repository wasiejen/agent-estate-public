# Contributing

This is a personal, self-directed open-source project — not a production
system. Contributions are welcome in the same shape the project itself works
in: small, reviewable commits, each one backed by something checkable.

How changes land here:

1. Describe the change and why, referencing the file or mechanism it touches.
2. Keep observable-behavior changes for discussion first (open an issue).
3. Run the gate after your change: `node .opencode/plugins/probes/handover_probe.mjs`
   plus the relevant smoke suite under `.opencode/plugins/tests/`.
4. Commit with an imperative one-line subject; open a pull request.

What needs a maintainer review before merge: `LICENSE`, the protocol text
(`AGENTS.md`), public claims (`README.md`, `docs/`), and anything under
`.opencode/plugins/` that changes tool behavior.

Keep claims honest: every number in the docs must point at a file, a test, or
a log line in the repository.
