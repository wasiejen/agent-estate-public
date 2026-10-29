# Security

Scope: this repository is an agent-workflow layer around a local CLI host. It
holds no secrets and runs no network service of its own.

Reporting: open a GitHub issue. Expect a response in days, not hours — this is
a personal project.

Things worth knowing:

- Custom tools and plugins run in the host process; they are the trust
  boundary. Tool file writes are sandboxed to the repository and the declared
  temp directory (`block_transfer` and friends enforce this).
- Agents in this estate never push and never send requests to the inference
  server directly; humans review protocol and license changes.
- The public history is a filtered extract of a private working repo. If you
  find personal data anywhere in it, report it as a security issue — that is
  a filter bug.

No hardening guarantees are made: do not run this on a machine handling
sensitive credentials without reading the plugins first.
