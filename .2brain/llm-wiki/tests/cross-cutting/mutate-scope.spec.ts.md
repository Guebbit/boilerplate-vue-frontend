---
source: tests/cross-cutting/mutate-scope.spec.ts
sha256: 6cca98c7fcdfe6bd7474352850ddb7fa56a4cb3dbe5e346e53336889808e523a
signature: 80f5a1971fb3d79f21a5640601666f4320a2e30b13f83b044212f45ce40145b9
generated_at: 2026-11-10T06:39:02.095164+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/mutate-scope.spec.ts

## Purpose

Guards against the silent failure mode of Stryker's `mutate` glob patterns: if a directory is renamed or moved, the glob simply matches nothing and those files quietly drop out of mutation coverage. This test turns that silent gap into a red CI run.

## Key elements

- **`PROJECT_ROOT`** — Set to `process.cwd()`. Deliberately avoids `import.meta.url` because Vite serves the module in a non-`file:` URL context under Vitest.
- **`mutatePatterns(): string[]`** — Reads `stryker.config.json` from the project root and returns the raw `mutate` array (positive globs plus `!`-prefixed exclusions).
- **`mutatedFiles(): Set<string>`** — Splits patterns into include/exclude sets and resolves them via `globSync`, returning the concrete set of files Stryker would actually mutate.
- **`'finds files to mutate'`** — Canary assertion: the resolved set must be non-empty, so a broken glob doesn't pass vacuously.
- **`'expands every include pattern to at least one real file'`** — Iterates each positive glob independently and asserts it matches ≥ 1 file on disk.

## Relationships

No graph neighbors. The file is self-contained: it reads `stryker.config.json` at runtime via `node:fs` but imports no other project source modules.

## Notes

- The test runs with `process.cwd()` as the glob base. If executed from a subdirectory (e.g., `npx vitest run tests/cross-cutting/`), `cwd` must still resolve to the repo root, or the globs will silently match nothing *and* the canary test will catch it as a failure.
- Exclusion patterns (`!…`) are never individually validated; only positive patterns are checked for non-emptiness. This is intentional — an exclusion that matches nothing is harmless.
