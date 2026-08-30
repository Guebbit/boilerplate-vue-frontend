# src/modules/wishlist/tests/routes.spec.ts

## Purpose

Guards the wishlist route table against silent security regressions. It asserts that the `Wishlist` route still declares `meta.access: 'auth'` and that no unlisted routes have been added to the module, because a route that loses its access requirement simply renders open.

## Key elements

- **`describe('wishlist route access')`** — the single test suite; no exported functions.
- **`it('Wishlist declares access: auth')`** — looks up the route by `name === 'Wishlist'` in the default-exported array and asserts `meta.access` equals `'auth'`.
- **`it('declares no route this file does not know about')`** — maps the routes array to `name` values and asserts the result is exactly `['Wishlist']`, catching any new route added without a corresponding test.

## Relationships

- **Imports** `routes` (default export) from `src/modules/wishlist/routes.ts` and reads its `name` and `meta.access` fields.
- No other file depends on this spec; it is a leaf test node.

## Notes

- The module-level doc comment references the account module's "twin" test as the origin of this pattern; both specs exist because a route with a dropped `meta.access` is not an error—it just becomes publicly accessible.
- The second test is a *closed-world* assertion: adding a new wishlist route without updating this spec will fail CI.
