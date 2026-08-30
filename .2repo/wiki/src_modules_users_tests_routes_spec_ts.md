# src/modules/users/tests/routes.spec.ts

## Purpose

Vitest spec that asserts every users route record declares the expected `meta.access` value and that no route exists without an explicit access decision. It guards against a route silently losing its access restriction, which would otherwise be indistinguishable from a public route in all other tests.

## Key elements

- **`byName(name)`** — local helper that looks up a `RouteRecordRaw` from the imported `routes` array by its `name` property.
- **`it.each` access assertions** — iterates a hard-coded table (`UsersList`, `UserCreate`, `UserTarget`, `UserEdit` → all `'admin'`) and asserts both that the route exists and that `meta.access` matches.
- **Completeness test** (`'declares no route this file does not know about'`) — compares the sorted list of all route names against the known set, catching any newly added route that lacks an access decision.

## Relationships

- **`src/modules/users/routes.ts`** — the sole import under test. This spec reads the raw `RouteRecordRaw` array directly (not a resolved router), so it needs no locale prefix or app context. The router spec (elsewhere) proves enforcement is *attached*; this spec proves the declarations are *present*.

## Notes

- The expected access values are written out explicitly rather than derived from the route records themselves. This is intentional: deriving from the source would make the test a tautology if a `meta.access` field were accidentally removed.
- The file lives in the users module (not a shared platform spec) so that deleting the domain does not break unrelated specs.
- Asserts against the module's own route records, not a mounted `createRouter` instance, keeping the test dependency-free.
