---
source: src/modules/example/tests/routes.spec.ts
sha256: 51a889592205585e1cdc12c7253b5e12a7538444b9772e31a555bd2573108091
generated_at: 2026-10-17T00:53:39.404906+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/routes.spec.ts

## Purpose

Pins every route the example module declares—by name, against the raw route records rather than a resolved router—so that a silently dropped `meta.access` or an accidentally added public route is caught at test time. Each expected permission value is written out explicitly rather than derived.

## Key elements

- **`byName(name)`** — looks up a `RouteRecordRaw` in the `routes` array by its `name` property; returns `undefined` if no route matches.
- **`describe('example route access')`** — the single test suite; contains five tests covering access metadata, the public route, guard attachment, path ordering, and route-set completeness.
- **`it.each([...])('%s needs a session and the %s permission…')`** — parameterized check that `ExamplesList`, `ExampleCreate`, `ExampleTarget`, and `ExampleEdit` all carry `meta.access === 'auth'` and `meta.can === [action, 'Example']`.
- **`it('serves the published example publicly')`** — asserts `ExamplePublished` exists but has *no* `access` or `can` key on `meta`.
- **`it('runs the teaching guard on the edit route only')`** — verifies `beforeEnter` on `ExampleEdit` equals `[exampleEditGuard]` and that no other route sets `beforeEnter`.
- **`it('declares create before :id…')`** — asserts `examples/create` appears before `examples/:id` in the array, preventing the literal word "create" from being captured as an `:id` param.
- **`it('declares no route this file does not know about')`** — sorted-name equality check that the route set is exactly the five known names; any new route breaks this test until the spec is updated.

## Relationships

- **`src/modules/example/routes.ts`** — default-imported as `routes`; this file is the single source of the route records under test.
- **`src/modules/example/guards.ts`** — `exampleEditGuard` is imported and compared by reference (`toEqual`) against the `beforeEnter` array on `ExampleEdit`.
- **`vue-router`** — `RouteRecordRaw` type is used for the `byName` return annotation.

## Notes

- The public-route test uses `not.toHaveProperty('access')` / `not.toHaveProperty('can')` instead of reading the keys directly. Because `routes` is typed with `satisfies RouteRecordRaw[]`, undeclared keys on `meta` are not accessible in TypeScript; asserting absence is both the type-safe and the semantically correct check.
- The "no unknown route" test is a completeness guard: adding a new route in `routes.ts` without updating this spec will fail CI, forcing the developer to decide and document the new route's access level here.
- Route ordering is tested positionally (`indexOf`), not by path-matching logic, because the concern is Vue Router's first-match semantics, not regex correctness.
