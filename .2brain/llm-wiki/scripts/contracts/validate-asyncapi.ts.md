---
source: scripts/contracts/validate-asyncapi.ts
sha256: 940a52a1c5dd676d06da1f00abada71696736af46ef3ed4f007725dfe59135f5
generated_at: 2026-10-16T23:58:32.854701+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/validate-asyncapi.ts

## Purpose

CLI script that validates one or more AsyncAPI documents using `@asyncapi/parser` and its default Spectral ruleset (`spectral:asyncapi/recommended`). It exists to replace the `asyncapi validate` command now that `@asyncapi/cli` (~446 MB, telemetry included) has been removed from the project. Run via `npm run lint:asyncapi`.

## Key elements

- **`files`** — array of CLI arguments (everything after the script name); the set of documents to validate.
- **`parser`** — a `Parser` instance from `@asyncapi/parser`, configured with the default ruleset automatically.
- **`isInvalid(diagnostics)`** — returns `true` if any diagnostic has `DiagnosticSeverity.Error`.
- **Main flow** — `Promise.all` over `files.map(...)`: reads each file synchronously, calls `parser.parse(source, { source })`, prints a validity line plus Spectral `stylish` output (if diagnostics exist), and collects a boolean per file. Exits `1` if any file is invalid; otherwise exits `0`.
- **`stylish`** (from `@stoplight/spectral-formatters`) — formats diagnostic output for the terminal.

## Relationships

No dependency-graph neighbors recorded.

## Notes

- **Duplicate enum identity:** `@asyncapi/parser` re-exports `DiagnosticSeverity` from one copy of `@stoplight/types`, while `@stoplight/spectral-formatters` pulls in a *separate* hoisted copy. They are structurally identical but not `===`-comparable across the two. The file suppresses the resulting ESLint `no-unsafe-enum-comparison` warning with a `// eslint-disable-next-line` and a block comment explaining the situation.
- Files are read with `readFileSync` *before* the `Promise.all`; the parallelism is only over the async `parser.parse` step.
- Exit code contract matches the old `asyncapi validate`: `0` on all-valid, `1` on any error-severity diagnostic or on parse/IO failure.
- The shebang is `#!/usr/bin/env tsx`; the script is executed directly (not compiled) via the `npm run lint:asyncapi` alias.
