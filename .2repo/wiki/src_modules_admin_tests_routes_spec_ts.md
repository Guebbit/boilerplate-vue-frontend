# src/modules/admin/tests/routes.spec.ts

## Purpose

Guarantees that every admin route carries an explicit `meta.access` declaration and that no route exists outside the set known to this test. Without this spec, a route that silently drops its access requirement would still render and pass every other test, becoming publicly accessible with no signal.

## Key elements

- **`byName(name)`** — Local helper that finds a `RouteRecordRaw` in the imported `routes` array by its `name` property.
- **`it.each([['Admin', 'admin']])`** — Parameterized assertion that each listed route exists and its `meta.access` equals the expected value. The expected value is hard-coded, not read back from the record, so a mutation of the value is caught.
- **`it('declares no route this file does not know about')`** — Exhaustiveness guard: asserts the sorted list of all route names in the module is exactly `['Admin']`. A new route added without an entry in the `it.each` table fails here.

## Relationships

- **`src/modules/admin/routes.ts`** — The sole production import. The spec reads the raw `routes` array directly (not a resolved router), so no app bootstrap, locale prefix, or router instance is required.

## Notes

- The access expectations are deliberately written as literals (`'admin'`) rather than derived from the route records. This means a developer who changes the access level on a route will get a test failure rather than a silent re-blessing.
- The file lives in the admin module (not a shared/platform spec) so that deleting the module doesn't orphan a platform-level test. See `docs/theory/modules.md` for the rationale.
- A separate router spec (not in this file) verifies that the access-check middleware is actually attached at runtime; this spec only verifies the *declaration* is present on the records.
