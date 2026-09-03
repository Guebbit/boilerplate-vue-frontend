# src/modules/inventory/tests/routes.spec.ts

## Purpose

Pins the `meta.access` value every inventory route declares, verified by route name against the raw route records (not a resolved router). It exists to catch a route that silently loses its access declaration, which would make it indistinguishable from a public route. Complements the router-level spec (which proves enforcement is attached) by proving the declarations themselves are present.

## Key elements

- **`byName(name: string): RouteRecordRaw | undefined`** — Local helper that searches the imported `routes` array for a record matching the given name.
- **`it.each([...])('%s declares access: %s', ...)`** — Parameterised assertion that `InventoryLedger` exists and carries `meta.access === 'admin'`.
- **`it('declares no route this file does not know about', ...)`** — Exhaustiveness guard: asserts the sorted list of all route names equals exactly `['InventoryLedger']`, so any newly added route fails this spec until an access decision is recorded.

## Relationships

- **`src/modules/inventory/routes.ts`** — The sole SUT. This spec imports its default export (`routes: RouteRecordRaw[]`) and inspects each record's `name` and `meta.access` fields directly. No router instance, locale prefix, or app shell is involved.

## Notes

- Access values are written out explicitly (e.g. `'admin'`) rather than derived from a central config, so a wrong or missing declaration is always a visible diff.
- The file intentionally avoids resolving the router; it operates on the static array, meaning it needs neither a locale prefix nor the rest of the app.
- The exhaustiveness test is the primary safety net for the stock board and its write forms — without it, a new route with no `meta.access` would go unguarded by any spec.
- Per the file's module doc-comment, the access table is a fact about *this domain* (see `docs/theory/modules.md`), not a generic assertion about the router.
