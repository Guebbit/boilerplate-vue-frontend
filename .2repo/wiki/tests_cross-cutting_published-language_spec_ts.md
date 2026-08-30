# tests/cross-cutting/published-language.spec.ts

## Purpose

A cross-cutting static-analysis test that enforces one structural invariant across all modules under `src/modules`: a module's `index.ts` barrel may publish **only** the names that sibling modules actually import. It exists to catch dead exports (names outliving their reason) and pointless barrels (a module that publishes to no one) as ordinary test failures, rather than letting them rot silently.

## Key elements

- **`listFiles(directory)`** — recursively collects every `.ts` / `.vue` file under a directory.
- **`clauseNames(clause)`** — splits an `import { … }` or `export { … }` clause into trimmed names, stripping `type` prefixes.
- **`moduleNames()`** — returns the sub-directory names of `src/modules`.
- **`publishedBy(name)`** — reads `<module>/index.ts` and returns a `Set` of published names (resolves `export { X as Y }` to `Y`). Returns `undefined` if the barrel does not exist.
- **`consumedFromBarrels()`** — scans every source file for `import { … } from '@/modules/<target>'` where the importing file belongs to a *different* module; returns `Map<module, Set<imported names>>`.
- **Test: "finds the barrels it is meant to check"** — canary assertion that at least 4 modules have a barrel, so the other tests cannot pass vacuously.
- **Test: "promises nothing to nobody"** — asserts the set-difference (published − consumed) is empty for every module.
- **Test: "gives no barrel to a module nothing imports"** — asserts no module has an `index.ts` whose consumed set is empty.

## Relationships

- **`docs/reference/tests.md`** — documents the cross-cutting test suite; this spec is one of the entries it lists.
- **`src/modules/locales/tests/use-dictionary-aggregation.spec.ts`** — an example of the "own-module spec" case this test explicitly *excludes*: a spec that imports its own module's barrel is treated as the module talking to itself, not as a sibling consumer.

## Notes

- The test reads the filesystem with `node:fs` (synchronous) and resolves `src/` relative to its own location (`../../src`); it does **not** import any project module.
- Only named `export { … }` (including `export { default as X }`) in a barrel are recognised. `export * from` and bare `export default` in an `index.ts` are invisible to the sweep.
- The "sibling" boundary is defined by top-level directory under `src/modules`. Files outside `src/modules` (e.g. app-level code) *do* count as consumers; a module's own files do not.
- The regex for imports is case-sensitive and expects the `@/modules/<name>` alias exactly; a different import path for the same barrel would go uncounted.
