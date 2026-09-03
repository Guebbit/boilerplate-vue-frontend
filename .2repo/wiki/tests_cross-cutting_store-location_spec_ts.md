# tests/cross-cutting/store-location.spec.ts

## Purpose

Cross-cutting structural test that enforces a single convention: every Pinia store in `src/modules/*` must live in either `store.ts` (one store) or `stores/*.ts` (multiple stores), and no module may mix both shapes. It exists because `vitest.config.ts` floors domain stores with a fixed glob; a store placed anywhere else simply drops out of coverage silently, and the green percentage quietly shrinks.

## Key elements

- **`MODULES_ROOT`** — Resolves to `src/modules` relative to the test file; the directory scanned for every assertion.
- **`sourceFiles(moduleRoot)`** — Recursively lists all `.ts` files under a module directory, excluding anything whose path segment is `tests`.
- **`moduleNames()`** — Returns the directory names directly under `MODULES_ROOT`.
- **`storeFilesOf(name)`** — Filters `sourceFiles` to only those containing the literal string `defineStore(`. Detection is content-based, not filename-based.
- **`isPermitted(relative)`** — Predicate that a module-relative path is exactly `store.ts` (one segment) or `stores/<anything>.ts` (two segments, first is `stores`).
- **`describe('where a module keeps its stores')`** — Three tests:
  1. *Per-module*: every file with `defineStore(` in each module passes `isPermitted`.
  2. *No mixed shapes*: no module simultaneously has `store.ts` **and** a file under `stores/`.
  3. *Guard on the guard*: at least 11 modules are found to contain stores, preventing the first two tests from passing vacuously over an empty list.

## Relationships

No direct imports from other project files. The test reads the on-disk layout of `src/modules/*` via `node:fs` and is implicitly coupled to the store-coverage glob defined in `vitest.config.ts` (referenced in the header comment, not imported).

## Notes

- Detection is by the `defineStore(` literal, not by filename. A file named `store.ts` that never calls `defineStore(` is invisible to this test; conversely a file named anything that *does* call it is caught.
- The `recursive: true` option on `readdirSync` means nested subdirectories (other than `tests/`) are included in the scan.
- The "guard on the guard" test uses a hard-coded threshold of `> 10` modules. If the codebase ever legitimately drops below that, the test will fail and need its constant adjusted.
- The file enforces a *naming/placement* convention only; it does not check that stores are exported, registered, or free of type errors.
