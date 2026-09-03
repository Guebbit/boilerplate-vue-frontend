# src/modules/locales/tests/routes.spec.ts

## Purpose

Pins the `meta.access` value every locales route declares, asserting each against an explicitly written expected value rather than a derived one. Its job is to prove the access *declarations* exist on the route records; enforcement (that the router actually checks them) is proven elsewhere.

## Key elements

- **`byName(name)`** — module-local helper that finds a route record by its `name` from the imported `routes` array.
- **`it.each` block (3 cases)** — asserts that `LocalesList`, `LocalesDictionary`, and `LocaleEntries` each exist and carry `meta.access === 'admin'`.
- **`'declares no route this file does not know about'` test** — asserts the full set of route names matches the three known names exactly, so a new route added without an access decision fails the suite.

## Relationships

- **`src/modules/locales/routes.ts`** — the sole SUT; this spec imports its default export (`routes`) and reads each record's `name` and `meta.access`. No other files are touched.

## Notes

- Expected access values are hard-coded per route on purpose: if a route silently drops `meta.access`, it becomes indistinguishable from a public route, and deriving the expectation from the record would hide that regression.
- The "unknown route" guard exists because the dictionary-import flow is otherwise unguarded by any spec; a new route with no access decision would pass every other test.
- Lives in the locales module (not a shared/infra spec) because it encodes a fact about *this* domain, per the module-ownership convention in `docs/theory/modules.md`.
