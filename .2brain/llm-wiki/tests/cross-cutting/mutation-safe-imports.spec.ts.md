---
source: tests/cross-cutting/mutation-safe-imports.spec.ts
sha256: ef687f88760a6a776b00f8b848b28e9a9062d364d2da167636f2d64470f77d52
signature: ed09af85fb6400a4566a07d146260e6e615aaf00bfefba5acecbc72d1b3b97d8
generated_at: 2026-11-10T06:39:27.034724+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/mutation-safe-imports.spec.ts

## Purpose

Static guard that verifies every dynamic-import specifier (template-literal `import(…)` and `import.meta.glob(…)`) inside Stryker's `mutate` scope carries a `Stryker disable` directive. Without it, Stryker's template-literal mutator would corrupt the specifier string, the instrumented build would fail to transform, and the mutation dry-run would die with a sandbox-path error that misleads readers into thinking the setup is broken rather than a specific line is unguarded.

## Key elements

- **`readMutateScope()`** – Reads `stryker.config.json`, resolves the `mutate` globs (honouring `!` exclusions) via `globSync`, returns a sorted file list.
- **`UNSAFE_SPECIFIERS`** – Two regexes: `import.meta.glob\s*\(` and a dynamic `import(` preceded by optional block comments followed by a backtick. The block-comment body uses a `(?:(?!\*/)[\S\s])*` lookahead form to avoid exponential backtracking (CodeQL js/redos).
- **`withoutLineComments(source)`** – Blanks `//` to end-of-line while preserving line count and column offsets, so the scanner never matches code inside a comment.
- **`isGuarded(lines, line)`** – Walks upward from the line (1-based) through contiguous comment lines (`//`, `*`, `/*`) looking for the text `Stryker disable`; stops at the first non-comment line.
- **`findSpecifiers(file)`** – Returns `{ file, line, kind, guarded }` for every unsafe specifier found in one file.
- **Two tests** – (1) A self-check asserting the scanner actually finds at least one `import.meta.glob` and one dynamic-import-template match (prevents a silently-passing broken regex). (2) Asserts the unguarded list is empty, printing `file:line (kind)` for each violation.

## Relationships

No graph neighbors. The file is a leaf: it imports only `node:fs`, `node:path`, and `vitest`. At runtime it reads `stryker.config.json` (for the `mutate` scope) and the source files within that scope (to scan for specifiers), but neither appears in the dependency graph.

## Notes

- Uses `process.cwd()` instead of `import.meta.url` because under Vitest/Vite the module is served over HTTP, not from a `file:` URL.
- `withoutLineComments` is deliberately naive: it does not account for `//` inside string or template literals. Acceptable here because the patterns being scanned are unlikely to appear inside such strings in this codebase, and the self-check test would catch a regression.
- The directive block must be **contiguous**: `isGuarded` stops walking at the first non-comment line, so a blank line between the comment and the code breaks the association.
- The `Stryker disable` text match is case-sensitive and must appear within the contiguous comment block immediately above the specifier line.
- Widening the `mutate` array in `stryker.config.json` automatically widens this check in the same commit, since the scope is read from the config rather than hardcoded.
