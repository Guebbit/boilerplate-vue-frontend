# src/modules/orders/tests/routes.spec.ts

## Purpose

Vitest spec that verifies every orders route record declares the expected `meta.access` value. It guards against a route silently losing its access declaration (which would make it indistinguishable from a public route) and against new routes being added without an explicit access decision.

## Key elements

- **`byName`** — local helper that finds a `RouteRecordRaw` by its `name` property within the imported `routes` array.
- **`describe('orders route access')`** — the single test suite.
  - `it.each([...])` — table-driven assertion that `OrdersList` → `auth`, `OrderTarget` → `auth`, `OrderEdit` → `admin`.
  - `it('declares no route this file does not know about')` — catch-all: the sorted list of all route names must equal exactly the three above, so any new route added to `routes.ts` breaks this test until it is listed here with an access level.

## Relationships

- **`src/modules/orders/routes.ts`** (imported as `routes`) — the spec reads the module's raw route-record array directly. It does not instantiate a router, resolve paths, or apply a locale prefix; it only inspects `name` and `meta.access` on the declared records.

## Notes

- Asserts against the raw route records, not a resolved router, so no app bootstrap or i18n context is needed.
- The catch-all test means adding a route to `routes.ts` without also adding a row to the `it.each` table (and updating the name list) will fail CI — this is intentional and forces an explicit access decision.
- Lives in the orders module (not a platform-level spec) so that deleting the domain does not break a shared test, per `docs/theory/modules.md`.
