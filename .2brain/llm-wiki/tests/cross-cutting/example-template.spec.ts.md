---
source: tests/cross-cutting/example-template.spec.ts
sha256: 2b10b5cb7e5343ac45a1192754728a0bf789cd96d78de7a15c1043863a5df7b6
signature: f7cf2942277a56152f52d8e6a6b85bc781abc3b73d72410bbbf6f0220a8eac36
generated_at: 2026-11-10T06:36:48.565022+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/example-template.spec.ts

## Purpose

A cross-cutting convention guard with two checks: (1) every file path cited in the module-template docs section of `docs/theory/modules.md` must actually exist under `src/modules/example/`, and (2) no module's `domain/` folder may export a status-transition table (`NEXT_STATUSES` / `TRANSITIONS`), enforcing that transition logic lives server-side only.

## Key elements

- **`sourceFiles(directory, prefix)`** — Recursively collects relative `.ts`/`.vue` file paths under a directory, skipping any `tests/` subfolder. Returns an empty array for non-matching extensions.
- **`ROOT` / `EXAMPLE_ROOT`** — Path constants anchored via `import.meta.url` to the repo root and to `src/modules/example/` respectively.
- **`describe('the example docs table names real files')`** — Extracts backtick-quoted paths matching `views|components|composables|domain` from the `## The module template` section of `docs/theory/modules.md` and asserts each one is present in the `sourceFiles(EXAMPLE_ROOT)` set.
- **`describe('no module keeps a status transition table on the client')`** — Iterates every subdirectory of `src/modules/`; for each `domain/` folder, reads every source file and asserts none contains an `export const NEXT_STATUSES` or `export const TRANSITIONS` declaration. Modules without a `domain/` folder are skipped silently.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The test is **read-only**: it never writes or creates files; it only inspects the repo tree and a single Markdown document.
- The second `describe` uses `it.each(modules)`, so the list of modules under test is derived dynamically from `src/modules/` at run time — adding a new module automatically adds a test case.
- The comment in the source clarifies *why* a regex on the export name is needed: `Record<XStatus, …>` shapes are already blocked by the `src/modules/*/domain` block in `eslint.config.ts`, but the *identifier name* (`NEXT_STATUSES`, `TRANSITIONS`) is not lint-covered, hence the belt-and-suspenders check here.
- The `sourceFiles` helper skips `tests/` subdirectories unconditionally, so test files inside a module are never counted as "existing source" when validating the docs table.
- Path joining uses `path.posix.join` for the relative-prefixed keys and `path.join` for OS-level resolution; the test therefore assumes forward-slash separators in the comparison set.
