---
source: scripts/contracts/validate-asyncapi.ts
sha256: a4fb46e317ea4474b470b4e1b608086a1dc44ec31297e3230c66e30731bbf283
generated_at: 2026-10-02T11:30:02.618425+00:00
model: ollama:qwen3.8:27b
---

# scripts/contracts/validate-asyncapi.ts

## Purpose

A standalone CLI script that validates AsyncAPI documents using `@asyncapi/parser` and its `spectral:asyncapi/recommended` ruleset. It replaces the removed `@asyncapi/cli` (`asyncapi validate`) while producing identical diagnostics, dropping the ~446 MB CLI bundle and its telemetry.

## Key elements

- **`isInvalid(diagnostics)`** — returns `true` if any diagnostic has `DiagnosticSeverity.Error`; mirrors the parser's own "invalid" definition.
- **`files`** — array of file paths from `process.argv.slice(2)`. The script exits with a usage message if the list is empty.
- **`parser`** — a single `Parser` instance from `@asyncapi/parser`, reused across all files.
- **Validation loop (`Promise.all`)** — parses each file in parallel via `parser.parse(readFileSync(file, 'utf8'), { source: file })`, prints a per-file verdict and (if any) a `stylish`-formatted diagnostic list, then resolves a boolean.
- **Exit-code contract** — exits `1` if any file is invalid or an unexpected error is thrown; exits `0` otherwise. Matches the old `asyncapi validate` behavior.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- **Duplicate `DiagnosticSeverity` enums.** `@stoplight/spectral-core` bundles its own copy of `@stoplight/types`, which is structurally identical to but *not* the same enum object that `@asyncapi/parser` re-exports. Comparing the two with `===` is therefore a cross-package enum comparison, guarded by an inline `eslint-disable` and a block comment. The comparison is safe at runtime (both use the same numeric values) but would not pass TypeScript's nominal identity check.
- **Output formatting** uses `@stoplight/spectral-formatters`'s `stylish` with `failSeverity: DiagnosticSeverity.Error`, so only error-level diagnostics count as "failures" in the printed report.
- **Invoked via** `npm run lint:asyncapi` (or directly with `npx tsx scripts/contracts/validate-asyncapi.ts <file...>`).
- **All-or-nothing exit code:** even a single invalid file causes a non-zero exit, regardless of the others passing.
