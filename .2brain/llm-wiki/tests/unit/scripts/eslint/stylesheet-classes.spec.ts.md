---
source: tests/unit/scripts/eslint/stylesheet-classes.spec.ts
sha256: 2aefcb23fa4167a7f557570a1eef83dfd015a1abcb1dd67ecf878020baee9883
signature: 2aefcb23fa4167a7f557570a1eef83dfd015a1abcb1dd67ecf878020baee9883
generated_at: 2026-11-10T08:20:05.545437+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/scripts/eslint/stylesheet-classes.spec.ts

## Purpose

Unit tests for the `scripts/eslint/stylesheet-classes` module, which extracts the set of CSS class names the app defines so the `no-unknown-classes` ESLint rule can differentiate a legitimately styled class from a typo.

## Key elements

- **`describe('classesOfCss')`** — Verifies that `classesOfCss` collects class names from selectors, `:deep(...)` wrappers, and `@media`-nested rules, while ignoring numeric values (`margin:0.5rem`) and bare type selectors.
- **`describe('readStylesheetClasses')`** — Builds a throwaway repo tree (global `.css` file, scoped SFC, unscoped SFC, style-less SFC) in a temp dir, then asserts that `readStylesheetClasses` classifies classes into `global` vs. `scopedByFile` correctly.
- **`describe('ignorePatterns')`** — Confirms that `ignorePatterns` returns a fully anchored, regex-escaped pattern (e.g. `^a\.b$`) for each class name.

## Relationships

- **`scripts/eslint/stylesheet-classes.ts`** — The sole module under test. This spec imports `classesOfCss`, `ignorePatterns`, and `readStylesheetClasses` from it and asserts on their return shapes (`Set<string>`, `Map<string, Set<string>>`, string).

## Notes

- The temp directory (via `mkdtempSync`) is created at `describe` scope and **never cleaned up**; it lives in the OS temp path for the duration of the process.
- File fixtures are written synchronously with `writeFileSync` before any `it` runs, so all tests in the `readStylesheetClasses` block share the same on-disk state.
- Assertions use `.toSorted()` (non-mutating, ES 2023) rather than `.sort()` to avoid mutating the `Set` iterator.
