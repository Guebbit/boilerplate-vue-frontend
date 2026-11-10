---
source: scripts/contracts/validate-asyncapi.ts
sha256: 940a52a1c5dd676d06da1f00abada71696736af46ef3ed4f007725dfe59135f5
signature: d051e84c341796b55a1b7a26ec46902a87af947132d55d95d0438a711f64cef0
generated_at: 2026-11-10T02:28:05.549848+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/validate-asyncapi.ts

## Purpose

Standalone CLI script that validates AsyncAPI documents using `@asyncapi/parser` with its default Spectral ruleset (`spectral:asyncapi/recommended`). It exists to replace the `asyncapi validate` command from `@asyncapi/cli`, eliminating that package's ~446 MB footprint and telemetry while producing identical diagnostics.

## Key elements

- **Entry point (script top-level):** Reads file paths from `process.argv.slice(2)`; exits 1 with a usage message if none are provided.
- **`parser` instance:** A `Parser` from `@asyncapi/parser`, which applies the `spectral:asyncapi/recommended` ruleset by default.
- **`isInvalid(diagnostics)`:** True when any diagnostic has `DiagnosticSeverity.Error` — the parser's own definition of an invalid document.
- **Validation flow (`Promise.all` …):** Parses each file in parallel via `parser.parse(readFileSync(file, 'utf8'), { source: file })`, prints a per-file valid/invalid line and (if diagnostics exist) the `stylish`-formatted diagnostic list, then exits 1 if any file was invalid.
- **`stylish` formatter (from `@stoplight/spectral-formatters`):** Renders diagnostics for terminal output; `failSeverity` is set to `DiagnosticSeverity.Error`.

## Relationships

None. This file has no dependency-graph neighbors in the repository.

## Notes

- Run via `npm run lint:asyncapi`; the file is executed with `tsx` (see the `#!/usr/bin/env tsx` shebang).
- **Dual `DiagnosticSeverity` enums:** `@asyncapi/parser` and `@stoplight/spectral-core` each nest their own copy of `@stoplight/types`, so the two `DiagnosticSeverity.Error` values are structurally identical but from different module instances. The `isInvalid` helper carries an `eslint-disable` for `@typescript-eslint/no-unsafe-enum-comparison` to suppress the resulting warning.
- Diagnostics are printed **as each file resolves** (`.then` inside the map), not after all files complete; the exit-code decision happens only in the final `.then`.
- The `source` option passed to `parser.parse` is the raw file path (a string), used by the parser to label diagnostics.
