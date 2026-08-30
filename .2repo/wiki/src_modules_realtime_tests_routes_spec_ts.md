# src/modules/realtime/tests/routes.spec.ts

## Purpose

Guarantees that every route in the realtime module explicitly declares a `meta.access` value, and that no route can be added without an access decision. It asserts against the module's own route records directly, so it needs neither a resolved router nor locale prefixes.

## Key elements

- **Access table** (`[['RealtimePlayground', 'admin']]`) — the single source of truth for what each route's `meta.access` must be. Values are written out literally (not derived from the records) so a silently-removed `meta.access` is caught.
- **`byName(name)`** — helper that looks up a route record by its `name` field from the imported `routes` array.
- **`it.each` test** — iterates the access table, asserts the route exists and its `meta.access` matches the expected value.
- **Closed-list test** — asserts the sorted set of all route names equals the known set, so a new route with no access decision fails the suite.

## Relationships

- **`src/modules/realtime/routes.ts`** — the sole import; this spec reads its default-exported `RouteRecordRaw[]` to perform its assertions. The two files are the declaration side and the verification side of the same access contract.

## Notes

- The access table lives here (in the module's own test) rather than in a shared platform spec, so deleting the realtime domain doesn't break unrelated specs. See `docs/theory/modules.md`.
- The complementary "enforcement is attached" check lives in the router spec, not here. This file only proves the declarations are *present* on the records.
- The closed-list test uses `toSorted()` on both sides, so ordering in `routes.ts` is irrelevant.
