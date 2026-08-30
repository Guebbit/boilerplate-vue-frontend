# src/modules/orders/tests/routes.spec.ts

## Purpose

Vitest spec that asserts every orders route record declares the expected `meta.access` value, and that no route exists outside the known set. It exists because a route that silently loses its `meta.access` is indistinguishable from a public one — no other test would flag it.

## Key elements

- **`byName(name)`** — local lookup helper; returns the `RouteRecordRaw` whose `name` matches, or `undefined`.
- **`it.each` access-assertion block** — iterates a hard-coded table (`OrdersList`→`auth`, `OrderTarget`→`auth`, `OrderEdit`→`admin`) and verifies each route exists and carries the exact `meta.access` value.
- **"declares no route this file does not know about" test** — compares the full set of route names against the hard-coded list; fails if a new route is added without an explicit access decision here.

## Relationships

- **`src/modules/orders/routes.ts`** — the file under test. This spec imports its default export (`routes`) and inspects each record's `name` and `meta.access` directly, without instantiating a router or resolving paths.

## Notes

- Expected access values are **deliberately hard-coded**, not read back from the records. Deriving them from the same source would make the test tautological and unable to catch a missing `meta.access`.
- Tests against raw route records (no locale prefix, no app-level router), so the spec is self-contained to the domain module.
- Adding a new route to `routes.ts` will break this spec until the new name is added to both the `it.each` table and the sorted-name comparison list.
- Placed in the domain module (not a platform-wide spec) so deleting the domain module does not break unrelated specs, per `docs/theory/modules.md`.
