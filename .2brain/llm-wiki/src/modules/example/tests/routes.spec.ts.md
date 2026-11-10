---
source: src/modules/example/tests/routes.spec.ts
sha256: 3a28b20b475bc75d2783c7b9e6729c0996e9df413de81e0c0bee87edc4387c26
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T04:27:03.604577+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/tests/routes.spec.ts

## Purpose

Vitest spec that pins the route table in the `example` module by name. It verifies each route's `meta.access`/`meta.can` values, confirms the one public route truly lacks them, asserts no route uses a `beforeEnter` guard, checks path declaration order, and guards against untracked routes. It validates the raw route records directly (not a resolved router) so a silently dropped `meta` field is caught as a failure, not a "no-op."

## Key elements

- **`byName(name)`** — Local helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` field; returns `undefined` if absent.
- **`describe('example route access')`** — Single suite containing all assertions:
  - Parametrized test (4 cases) asserting `meta.access === 'auth'` and `meta.can` equals `[action, 'Example']` for `ExamplesList`, `ExampleCreate`, `ExampleTarget`, `ExampleEdit`.
  - Public-route test asserting `ExamplePublished`'s `meta` has **no** `access` or `can` key.
  - No-guard test asserting no route carries a `beforeEnter` key.
  - Ordering test asserting the `examples/create` path appears before `examples/:id`.
  - Completeness test asserting the sorted set of route names exactly matches the 5 known names.

## Relationships

- **`src/modules/example/routes.ts`** — Sole import. The spec reads the default-exported `routes` array (typed via `satisfies RouteRecordRaw[]`) and makes every assertion against those records. No other module is touched.

## Notes

- The file deliberately uses `not.toHaveProperty` / `'beforeEnter' in route` instead of reading the property directly, because the source table uses `satisfies RouteRecordRaw[]` — keys not declared on the object are not readable, so *absence* is the assertion and must be tested that way.
- Every expected permission string is spelled out in the test rather than derived from a shared constant, so a regression that drops `meta.access` (making a route silently public) fails the explicit `'auth'` expectation.
- The completeness test (`declares no route this file does not know about`) acts as a change-detection gate: adding a route to `routes.ts` without updating this spec will fail CI.
- The ordering test exists because Vue Router matches paths in declaration order; if `examples/:id` came first, the literal word "create" in the URL would be captured as the `:id` parameter.
