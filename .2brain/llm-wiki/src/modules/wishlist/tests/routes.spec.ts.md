---
source: src/modules/wishlist/tests/routes.spec.ts
sha256: 6f1419645193af255bf56373d7bf6cea852b75160b0c655ca172cbac75f17a7e
generated_at: 2026-10-17T01:55:15.936757+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/tests/routes.spec.ts

## Purpose

Vitest spec that guards the wishlist router against two failure modes: a route silently losing its `meta.access` declaration (which would leave it publicly reachable) and the introduction of a new route that no test is aware of. It exists so that access-control regressions surface in CI rather than in production.

## Key elements

- **`describe('wishlist route access')`** – Top-level suite; all assertions live under it.
- **`'Wishlist declares access: auth'`** – Looks up the route named `Wishlist` in the imported routes array and asserts `route.meta.access === 'auth'`.
- **`'declares no route this file does not know about'`** – Maps the routes array to names and asserts strict equality with `['Wishlist']`, failing if anyone adds a new route without updating the spec.

## Relationships

- **`src/modules/wishlist/routes.ts`** – Imported as the default export and is the sole subject under test. The spec reads its array of route definitions (name + `meta` fields) but does not call any router function.

## Notes

- The "no unknown routes" test is intentionally brittle by design: adding a new wishlist route requires updating the expected array in the same PR, making the test act as a registration checklist.
- Access values are string literals (`'auth'`), not enums; a typo in `routes.ts` will be caught here.
- The file-level doc comment references the account module's equivalent spec as the origin of this pattern.
