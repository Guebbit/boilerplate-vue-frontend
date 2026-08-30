# tests/cross-cutting/store-location.spec.ts

## Purpose

Cross-cutting structural test that enforces where Pinia stores are declared within each module. It exists because `vitest.config.ts` floors domain-store coverage with a fixed glob; a store in any other location silently drops out of coverage without lowering the green number. This test makes that violation loud.

## Key elements

- **`sourceFiles(moduleRoot)`** — Recursively lists all `.ts` source files under a module directory, excluding anything under a `tests/` folder.
- **`moduleNames()`** — Returns the directory names under `src/modules/`.
- **`storeFilesOf(name)`** — Returns module-relative paths of every file whose source contains the string `defineStore(`. Matching on the call (not the filename) is the entire point.
- **`isPermitted(relative)`** — Predicate that accepts exactly two shapes: `store.ts` (single segment) or `stores/<something>.ts` (two segments under a `stores/` directory).
- **Test: placement** — For every module, asserts no `defineStore(` file sits outside the two permitted shapes.
- **Test: mutual exclusion** — Asserts no module declares stores in *both* `store.ts` and `stores/` simultaneously.
- **Test: meta-guard ("finds the stores it is meant to be checking")** — Asserts that at least 10 modules actually yield store files, preventing a broken search (renamed root, changed layout) from making every other assertion pass vacuously over an empty list.

## Relationships

- **`src/modules/*/store.ts`** — The target of the check. Each module's store file (or `stores/` directory) must satisfy the location and exclusivity rules enforced here.
- **`docs/reference/tests.md`** — Documents this spec as part of the cross-cutting test suite that reviewers and contributors are expected to run.

## Notes

- The test hardcodes `> 10` as the minimum store count in the meta-guard. Adding or removing modules is fine, but dropping below 11 store-bearing modules will fail this check even if the layout is correct — adjust the threshold if the codebase legitimately shrinks.
- Matching is a raw `includes('defineStore(')` string check, not a parse. A comment containing that literal would register as a store file; keep comments free of that exact token.
- The file's own header comment is the authoritative rationale for the two permitted shapes and the "never both" rule; read it before renaming a store file or adding a second store to a module.
