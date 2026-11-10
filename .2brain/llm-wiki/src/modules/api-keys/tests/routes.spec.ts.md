---
source: src/modules/api-keys/tests/routes.spec.ts
sha256: 9d1722f27bf49f1f71e6251dfceda39f50181f746b258a4c5d89b0f61675a369
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T03:51:15.348002+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` values that every api-keys route declares, so a route that silently loses its access gate becomes indistinguishable from a public one and is caught by CI. Checks against the module's raw route records (by name) rather than a resolved router, so no locale prefix or full app context is needed.

## Key elements

- **`byName(name)`** — local helper that finds a `RouteRecordRaw` in the imported route array by its `name` property; returns `undefined` if no match.
- **`describe('api-keys route access')`** — the single test block; contains two `it` cases.
- **`it.each([...])`** — data-driven assertion that named routes (`ApiKeysList`, `ApiKeyCreate`) declare the exact `meta.access` string and `meta.can` tuple.
- **`it('declares no route this file does not know about')`** — completeness guard: asserts the full set of route names equals the two known names, catching a newly added route that has no access decision.

## Relationships

- **`src/modules/api-keys/routes.ts`** — the sole import under test. This spec reads its default export (an array of `RouteRecordRaw`) and asserts on the `name` and `meta` fields of each record. No router resolution, no mounting, no side effects.

## Notes

- Expected values are written out as literals in the test table rather than derived from a shared constant, so the test fails loudly if the source drifts.
- The completeness test (`toSorted()` comparison) means adding a new route to `routes.ts` without updating this spec will break the build.
- The file is colocated with the module (`tests/` subdirectory) rather than living in a global test tree, per the project's module-ownership convention referenced in `docs/theory/modules.md`.
