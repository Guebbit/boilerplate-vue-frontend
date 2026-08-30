# tests/cross-cutting/module-file-shapes.spec.ts

## Purpose

Enforces that every file inside an enabled module folder matches a known shape in a fixed catalogue. A file with no matching entry causes the test to fail, making it a single point where someone must consciously justify (or reject) a new file name before it becomes invisible. Complements `store-location.spec.ts`, which only polices store filenames and lets stray files slip through.

## Key elements

- **`FileShape`** — interface pairing a `RegExp` (matched against the module-relative path) with a one-line `what` description.
- **`FILE_SHAPES`** — ordered array of all allowed shapes (most-specific first; first match wins). Covers `module.ts`, `routes.ts`, `store.ts`, `views/`, `domain/`, `composables/`, `locales/`, `tests/`, and a handful of module-specific files (`guards.ts`, `dictionaries.ts`, `types.ts`, etc.).
- **`walk(directory)`** — recursive, sorted file listing relative to a base directory.
- **`filesInModules()`** — enumerates every file across all `enabledModules`, returning `{ module, file }` pairs.
- **Test: "describes every file a module folder holds"** — asserts the list of un-matched files is empty.
- **Test: "is sweeping the files it is meant to be sweeping"** — asserts >100 files were found, guarding against a broken `walk` or an emptied module registry producing a vacuous pass.

## Relationships

- **`docs/reference/src-modules.md`** — documents the module structure that this test codifies; the `FILE_SHAPES` catalogue mirrors the per-file table described in that reference.
- **`docs/reference/tests.md`** — lists this spec as part of the cross-cutting test suite alongside other structural guards.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — a concrete file the sweep encounters; it matches the `tests/.+\.spec\.ts` shape, so its presence is expected and passes.

## Notes

- The catalogue previously lived in `scripts/module-docs/shapes.ts` (a doc generator). The generator was removed; the enforcement rule was extracted into this spec. The `what` strings are retained as inline documentation even though nothing renders them.
- Matching order matters: `domain/index.ts` must appear before `domain/.+.ts`; `stores/.+.ts` is distinct from `store.ts`. Reordering entries can silently change which description "wins."
- The test only walks `enabledModules` from `@/modules`. A module that is disabled (e.g. behind a feature flag) is invisible to this check.
- The second test (count > 100) is deliberately low-threshold; it exists purely to catch a broken enumeration, not to pin an exact file count.
