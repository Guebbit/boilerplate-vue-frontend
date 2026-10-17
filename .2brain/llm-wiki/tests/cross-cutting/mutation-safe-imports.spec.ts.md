---
source: tests/cross-cutting/mutation-safe-imports.spec.ts
sha256: e67d94a6dfd9d878514f98004ed0fa66d693f5e623a0e5a7f3c837d294ffc6d3
generated_at: 2026-10-17T02:01:36.522587+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/mutation-safe-imports.spec.ts

## Purpose

Static guard that every template-literal `import(...)` and `import.meta.glob(...)` specifier inside the Stryker mutation scope is preceded by a `// Stryker disable` directive. Without it, Stryker's template-literal mutator would replace the specifier with an empty string, causing the instrumented build to fail during the dry-run phase with an unhelpful sandbox-path error before a single mutant is evaluated.

## Key elements

- **`PROJECT_ROOT`** – Set to `process.cwd()` (not `import.meta.url`) because Vite serves this module and the URL is not a `file:` URL.
- **`readMutateScope()`** – Parses `stryker.config.json`, separates include/exclude glob patterns, and resolves them via `globSync` into a sorted file list. Widening `mutate` in the config automatically widens this check.
- **`withoutLineComments(source)`** – Replaces `//`-comment text with spaces while preserving line count and column positions, so a match index still maps to its real line.
- **`UNSAFE_SPECIFIERS`** – Two regexes: one for `import.meta.glob(`, one for `import(` immediately followed by a backtick (allowing interleaved `/* */` hints and a line-wrap). The block-comment portion uses a `(?:(?!\*\/)[\S\s])*` body to avoid exponential backtracking (CodeQL js/redos).
- **`isGuarded(lines, line)`** – Walks upward from the line above the specifier through contiguous comment lines (`//`, `*`, `/*`) looking for the text `Stryker disable`.
- **`findSpecifiers(file)`** – Reads a source file, strips line comments, applies both regexes, and returns a `Specifier[]` with file, 1-based line, kind, and guarded flag.
- **Three `it` blocks** – (1) the scope resolves to at least one file; (2) at least one specifier of each kind is found (self-validates the matchers); (3) every specifier is guarded, listing `file:line (kind)` for any violation.

## Relationships

No graph neighbors are recorded for this file. It reads `stryker.config.json` at runtime but does not import it as a module.

## Notes

- The scope is **read from** `stryker.config.json` at test time, not hard-coded, so adding a new `mutate` glob automatically brings those files under this check.
- The guard comment may be multi-line (a contiguous `/* … */` or `// …` block) as long as it ends on the line immediately before the code; `isGuarded` walks upward until it hits a non-comment line.
- The "finds the specifiers" assertion exists specifically so that a regex regression cannot make the "guards every one" test pass vacuously.
- The failure message lists each unguarded location (`file:line (kind)`) rather than a count, because the mutation failure this prevents only names a sandbox path and gives no line number.
