---
source: tests/cross-cutting/published-language.spec.ts
sha256: 9605db20b30718f801d73560608f1ae786526742b3345fa8a98a46f949d36f40
signature: 4baec1c1babd054f58395621f42583d2a69e99b6557b3cc8aa8074e876e2e5c4
generated_at: 2026-11-10T06:40:12.148473+00:00
model: ollama:qwen3.8:27b
---

# tests/cross-cutting/published-language.spec.ts

## Purpose

A cross-cutting architectural test that enforces one rule across every module under `src/modules/`: **a module's barrel (`index.ts`) must export only names that at least one sibling module actually imports.** It walks the filesystem directly (no code imports), parses every barrel's `export { … }` clauses, scans all non-test source files for `import { … } from '@/modules/<name>'` statements, and fails if any export has no sibling consumer or if a barrel exists for a module nothing imports.

## Key elements

- **`SOURCE_ROOT` / `MODULES_ROOT`** — path constants resolved two levels above this file; anchor all filesystem walks to `src/modules/`.
- **`listFiles(directory)`** — recursively collects every `.ts` and `.vue` file under a directory.
- **`clauseNames(clause)`** — splits a `{ … }` import/export clause into trimmed names, stripping `type` prefixes.
- **`moduleNames()`** — returns directory names under `src/modules/`.
- **`publishedBy(name)`** — reads `<module>/index.ts`, extracts all `export { … }` (and `export type { … }`) clauses via regex, and returns the `Set` of published names (alias-aware: `export { default as X }` publishes `X`). Returns `undefined` if no barrel exists.
- **`importedNames(source, target)`** — regex-matches all `import { … } from '@/modules/<target>'` statements in a source string and returns the imported names (alias stripped, left-hand name kept).
- **`isInTestsFolder(file)`** — checks whether any path segment relative to `SOURCE_ROOT` is `tests`, so spec files are excluded from the consumer scan.
- **`consumedFromBarrels()`** — iterates every non-test source file under `src/`, determines its owning module, and builds a `Map<module, Set<importedNames>>` of what siblings actually consume. A module importing its own barrel does not count.
- **Test block: "a barrel publishes exactly what a sibling imports"**
  - *canary* — asserts at least one module has a barrel, so an empty sweep can't masquerade as a pass.
  - *promises nothing to nobody* — collects every exported name with zero sibling imports; expects the list to be empty.
  - *gives no barrel to a module nothing imports* — flags modules whose barrel exists but whose `consumed` set is empty; expects none.

## Relationships

No direct code-level interaction with the listed graph neighbors (`src/modules/shop-tasks/tests/notices.spec.ts`, `tests/unit/docker/security-txt-entrypoint.spec.ts`) is visible in this file. The test is self-contained: it reads the filesystem and parses source text without importing any application module. Its relationship to other specs is purely structural — it lives in `tests/cross-cutting/` alongside other repo-wide invariant checks.

## Notes

- **Filesystem-driven, not import-driven.** The test uses `node:fs` to discover modules and read files. Adding a new module under `src/modules/` is picked up automatically; no test config update is needed.
- **Specs are not consumers.** Any file whose path contains a `tests` segment is skipped during the consumer scan, so a barrel export used *only* by a spec does not satisfy the rule. Test plumbing is expected to reach internals through `tests/support/`.
- **Self-imports don't count.** If module `a` re-exports from `a/index.ts`, that is the module talking to itself and is excluded from the consumed set.
- **Alias handling is asymmetric and intentional.** `publishedBy` records the *right-hand* name (what the caller writes), while `importedNames` records the *left-hand* name (the original export name). This means `import { original as alias }` is matched against the barrel's `original` export.
- **The canary floor is 1, not the current barrel count.** Deleting a domain module must not also delete the canary; the assertion only guards against a broken sweep that finds zero barrels.
