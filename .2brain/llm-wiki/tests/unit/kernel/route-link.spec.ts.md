---
source: tests/unit/kernel/route-link.spec.ts
sha256: 584c2405bea5bfba2cee58b3432d03a72d2f23c251e744b97479d6b873271928
signature: f1de383e29fdc7c6b3a773b938d2e41df341926906def407d7733c9b6a352048
generated_at: 2026-11-10T08:10:19.030306+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/kernel/route-link.spec.ts

## Purpose

Unit tests for the `linkIfRouted` helper in `src/kernel/route-link.ts`. The file verifies that the helper returns the correct Vue-router location object (or `undefined`) depending on whether a route name exists in the current build, and that params vs. query are shaped correctly.

## Key elements

- **`routerWith(names)`** – Inline stub factory. Returns an object whose only method is `hasRoute(name)`, implemented as a simple membership check on the supplied array. Used to simulate a router that either ships or omits specific routes without pulling in a real router instance.
- **`describe('linkIfRouted')`** – Four test cases covering:
  - Returns `undefined` when the target route is absent from the build.
  - Returns `{ name, params }` when the route resolves and params are supplied.
  - Returns `{ name }` only (no `params` key) when no params are passed.
  - Returns `{ name, query }` when a query object is passed instead of params (the "AuditLog" shape).

## Relationships

No direct code-level interaction with the listed graph neighbor (`src/modules/shop-tasks/tests/notices.spec.ts`) is visible in this file's imports or logic. Both files independently exercise route-linking logic in different module contexts.

## Notes

- The file header comment frames `linkIfRouted` as the general-purpose counterpart to `signInLocation`'s own guard, specifically for route names that have no `dependsOn` coupling.
- Tests assert with `toEqual` (structural equality) rather than `toBe`, so the absence of a `params` key is explicitly verified as "not present," not just `undefined`.
- The fourth test (`AuditLog`) documents the `query`-instead-of-`params` convention used by that particular route's shape.
