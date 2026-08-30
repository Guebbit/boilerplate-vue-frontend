# src/modules/cart/tests/routes.spec.ts

## Purpose

Guarantees that every cart route declares its access requirement (`meta.access`) and that no route exists outside this file's explicit list. Without this spec, a route that silently loses its `meta.access` would remain indistinguishable from a public route—still rendering, still passing every other test—while simply becoming open to everyone.

## Key elements

- **`byName(name)`** — local helper that looks up a route in the imported `routes` array by its `name` field; returns `RouteRecordRaw | undefined`.
- **`it.each([['Cart', 'auth']])`** — parameterized assertion: for each listed route, the route must exist *and* its `meta.access` must equal the expected value. Values are written out explicitly (not derived from the routes) so a missing `meta.access` fails rather than being silently skipped.
- **`it('declares no route this file does not know about')`** — exhaustiveness guard: the sorted list of all route names must equal the sorted list of names this spec already accounts for. Catches a new route added without an access decision.

## Relationships

- **`src/modules/cart/routes.ts`** — the sole import under test. This spec reads the raw `RouteRecordRaw[]` array directly (not a resolved router), so it needs no app bootstrap, locale prefix, or other modules.

## Notes

- Expected access values are **hardcoded in the test**, not read from the routes themselves. This is deliberate: if `meta.access` is deleted from a route, a derived assertion would pass trivially (undefined === undefined), but a literal `'auth'` expectation fails.
- Because it asserts against the module's own records, it runs without the full Vue router or any locale middleware.
- Per the module theory (`docs/theory/modules.md`), this spec lives inside the cart module: it encodes a fact about *this* domain, so deleting the cart module removes the spec alongside it rather than breaking a platform-level test.
- The router-level spec (elsewhere) proves access enforcement is *attached*; this spec proves the declarations are *present*. They are complementary, not redundant.
