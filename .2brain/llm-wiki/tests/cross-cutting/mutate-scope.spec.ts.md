---
source: tests/cross-cutting/mutate-scope.spec.ts
sha256: 6cca98c7fcdfe6bd7474352850ddb7fa56a4cb3dbe5e346e53336889808e523a
generated_at: 2026-10-17T02:01:24.337365+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/mutate-scope.spec.ts

## Purpose

Guarantees that the `mutate` globs declared in `stryker.config.json` still resolve to at least one real file. A glob that silently matches nothing (e.g. after a directory rename) would stop measuring code without any error; this test turns that quiet gap into a red test run.

## Key elements

- **`PROJECT_ROOT`** — Resolved via `process.cwd()`. Used as the base directory for all glob resolution.
- **`mutatePatterns(): string[]`** — Reads `stryker.config.json` and returns the raw `mutate` array (positive globs and `!`-prefixed exclusions).
- **`mutatedFiles(): Set<string>`** — Expands the include/exclude patterns with `globSync` and returns the resulting file set.
- **`it('finds files to mutate')`** — Canary assertion: `mutatedFiles().size > 0`, preventing the second test from passing vacuously.
- **`it('expands every include pattern to at least one real file')`** — Iterates each positive pattern, globs it individually, and asserts none are empty.

## Relationships

No dependency-graph neighbors are recorded for this file. It reads `stryker.config.json` at test time (filesystem I/O, not a static import).

## Notes

- **`process.cwd()` over `import.meta.url`**: Under Vitest the module is served through Vite, so `import.meta.url` is not a `file:` URL and cannot be converted to a directory. The test must be run from the project root (the default `vitest` invocation).
- **Exclusion convention**: Patterns starting with `!` are Stryker's exclusion syntax; this test strips the `!` and passes the remainder to `globSync`'s `exclude` option.
- **Canary pattern**: The first test exists solely so that if the config is empty or `globSync` is broken, the second test's `expect([]).toEqual([])` assertion does not silently pass.
