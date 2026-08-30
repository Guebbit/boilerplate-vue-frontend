# src/modules/products/tests/routes.spec.ts

## Purpose
Table-driven Vitest spec that verifies every route in the products module declares the expected `meta.access` value, and that no route exists outside the known set. It guards against a route silently losing its access declaration (making it public) or a new route being added without an access decision.

## Key elements
- **`byName(name)`** — local helper that finds a `RouteRecordRaw` in the imported routes array by `route.name`.
- **`it.each([...])('%s declares access: %s')`** — table-driven assertion checking each route's `meta.access` against a hardcoded expected value (`undefined` for public, `'admin'` for protected). Expectations are written out explicitly rather than derived from the route records, so a lost access field fails the test instead of matching itself.
- **`it('declares no route this file does not know about')`** — closed-set check: the sorted list of all route names in `routes` must equal the sorted list of the four names in the table. Catches any new route added without a corresponding entry above.

## Relationships
- **`src/modules/products/routes.ts`** — the sole production import. The spec reads the raw `RouteRecordRaw[]` exported by default from that file. It does not mount a router, apply locale prefixes, or touch the rest of the app; it inspects the module's own route table directly.

## Notes
- The expected access values are intentionally *not* read from the route objects. Deriving them from the records under test would make the assertion tautological and unable to detect a missing `meta.access`.
- The closed-set check means adding a new product route without also adding a row to the `it.each` table will fail CI. Keep both in sync.
- The file's header comment references `docs/theory/modules.md` for the architectural rationale (domain-specific facts live in the domain module, not a platform-wide spec).
