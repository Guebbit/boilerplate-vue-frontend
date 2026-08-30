# tests/cross-cutting/mutation-safe-imports.spec.ts

## Purpose

Guards against Stryker's template-literal mutator turning dynamic import specifiers (`import(\`...\`)`, `import.meta.glob('...')`) into empty strings, which causes the instrumented build to fail in the dry-run with an unhelpful sandbox-path error. Every such specifier inside the `mutate` scope must carry a `Stryker disable` comment directive directly above it; this test enforces that.

## Key elements

- **`readMutateScope()`** — Parses `stryker.config.json`, separates `mutate` entries into include/exclude globs, and resolves them via `globSync` to a sorted file list.
- **`withoutLineComments(source)`** — Replaces `//`-comment content with spaces, preserving line count and column positions so match indices still map to real lines.
- **`UNSAFE_SPECIFIERS`** — Two regexes: one for `import.meta.glob(`, one for dynamic `import(` followed by a template-literal backtick (tolerating block-comment chunk hints and a line break before the backtick).
- **`isGuarded(lines, line)`** — Walks upward from the target line through contiguous comment lines (`//`, `*`, `/*`), returning `true` if any line contains `Stryker disable`.
- **`findSpecifiers(file)`** — Reads a file, strips line comments, runs both patterns, and returns `{ file, line, kind, guarded }` for each match.
- **Three test cases** — (1) the resolved scope is non-empty, (2) both specifier kinds are actually found (prevents a broken matcher from passing vacuously), (3) every found specifier is guarded; unguarded ones are listed as `file:line (kind)` in the failure message.

## Relationships

None (no graph neighbors).

## Notes

- **`process.cwd()` over `import.meta.url`** — Under vitest the module is served by Vite, so `import.meta.url` is not a `file:` URL and cannot be converted to a directory.
- **Scope is read, not hardcoded** — Widening `mutate` in `stryker.config.json` automatically widens this sweep in the same commit; no list to keep in sync here.
- **`isGuarded` walks multiple lines** — The directive block may span several comment lines; the function stops at the first non-comment line, so the block must be contiguous and end immediately before the code.
- **Dynamic-import regex allows a line break** — `import(\n  \`...\`)` is matched because the pattern uses `\s*` before the backtick, covering wrapped call syntax.
- **Failure message is designed to name the fix location** — The list of unguarded `file:line (kind)` entries exists because the Stryker error this protects against only reports a sandbox path, not the offending line.
