---
source: src/modules/returns/tests/routes.spec.ts
sha256: 06cdc0c9ac4a62a548b2834a4e790e842e54aba94b9dcafd21eebe922cf30eee
generated_at: 2026-10-17T01:38:46.801903+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/routes.spec.ts

## Purpose

Guards the access-control contract of every returns route. A route that silently loses its `meta.access` would keep rendering but become publicly reachable, so this spec pins the expected value (`'auth'`) on each route and asserts no route-level `can` rule is present. It also acts as a closed-world check: any new route added to the module fails this file until the test is updated.

## Key elements

- **`describe('returns route access')`** — top-level block; all assertions live inside it.
- **`it.each([['ReturnsList'], ['ReturnTarget']])('%s requires a session')`** — for each named route, looks it up in the `routes` array and asserts:
  - `meta.access` is exactly `'auth'`
  - `meta` does **not** carry a `can` property (staff permissions belong to `Return.actions`, not the route)
- **`'declares no route this file does not know about'`** — asserts the full set of route names (sorted) equals `['ReturnTarget', 'ReturnsList']`, catching any undeclared route.

## Relationships

- **`src/modules/returns/routes.ts`** — the sole import. The test reads its default export (the `routes` array) and inspects each record's `name` and `meta` fields. No other modules are touched.

## Notes

- The test uses `toSorted()` (returns a new array) rather than `sort()`; the comparison is order-insensitive.
- The closed-world assertion means adding a new route to `routes.ts` will fail this spec until the `it.each` list and the expected-name array are both extended.
- The module doc comment clarifies the design intent: `meta.access: 'auth'` only requires a session; fine-grained permissions are delegated to `Return.actions`, so a `can` key on the route would be a design violation.
