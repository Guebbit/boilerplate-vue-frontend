# src/modules/products/tests/routes.spec.ts

## Purpose

Table-driven Vitest spec that asserts every route in the products module declares an explicit `meta.access` value, and that no route exists outside the tested set. It inspects the raw route records directly (no resolved router, no locale prefix), so it runs as a standalone fact about this module's declarations.

## Key elements

- **`byName(name)`** — helper that finds a `RouteRecordRaw` in the imported route table by its `name` string.
- **`it.each([...])` block** — one case per known route, asserting both that the route exists and that its `meta.access` equals the expected literal (`undefined` for public, `'admin'` for protected). Expected values are written out explicitly so a silently dropped `meta.access` fails the test.
- **Closed-set test** — maps all route names and asserts the sorted list equals the four known names, catching any newly added route that has no corresponding access decision.

## Relationships

- **`src/modules/products/routes.ts`** — the sole subject under test. This spec imports its default export (the array of `RouteRecordRaw` objects) and reads each record's `name` and `meta.access`. It does not mount, resolve, or navigate through the router; it treats the export as plain data.

## Notes

- The spec deliberately tests the *declaration* (the data in `routes.ts`), not *enforcement* (which belongs to a router-level spec). The two are complementary but independent.
- Adding a new route to `routes.ts` without updating the `it.each` array **and** the closed-set literal will cause both tests to fail — that is intentional.
- `meta.access` values are compared with `toBe` against the literal, not derived from any shared constant, so a refactor that renames the key or changes the type will surface here.
