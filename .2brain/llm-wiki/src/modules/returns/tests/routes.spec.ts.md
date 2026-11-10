---
source: src/modules/returns/tests/routes.spec.ts
sha256: a305b970062d29f4a29afd95e6a27bb830c8e011ed60efda249710fca0796b4a
signature: a305b970062d29f4a29afd95e6a27bb830c8e011ed60efda249710fca0796b4a
generated_at: 2026-11-10T05:40:25.447001+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/routes.spec.ts

## Purpose

Vitest spec that pins the `meta.access` contract of every returns route. Its goal is to catch a route that silently loses its `'auth'` requirement (which would make it publicly accessible) and to keep the route inventory exhaustive so new routes cannot be added without a corresponding test.

## Key elements

- **`describe('returns route access')`** — top-level block; all assertions live here.
- **`it.each([['ReturnsList'], ['ReturnTarget']])('%s requires a session')`** — parameterised test asserting each of those routes declares `meta.access === 'auth'` and has **no** `meta.can` key (i.e. any authenticated customer may view their own returns).
- **`it('SalesReturns requires a session and the key that reads every return')`** — asserts the staff-level route additionally carries `meta.can` equal to `['read', 'Return']`.
- **`it('declares no route this file does not know about')`** — exhaustive guard: the sorted list of route names must match exactly `['ReturnTarget', 'ReturnsList', 'SalesReturns']`, preventing undeclared routes from slipping in.

## Relationships

- **`src/modules/returns/routes.ts`** — the sole production dependency. The spec imports its default-exported `routes` array and asserts on each record's `name`, `meta.access`, and `meta.can` fields. No other module is touched.

## Notes

- The module-level JSDoc makes an intentional design decision explicit: staff permission for mutations is enforced through `Return.actions`, **not** through a route-level `meta.can`. Only the read-everything `SalesReturns` route uses `meta.can`; all customer-facing routes must remain `can`-free.
- The exhaustive-name test (last `it`) is the mechanism that forces a developer to extend this spec whenever a new route is added to `routes.ts`; forgetting to do so will fail the suite rather than silently allow a route with no access contract.
