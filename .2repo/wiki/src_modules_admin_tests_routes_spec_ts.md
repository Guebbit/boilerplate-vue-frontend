# src/modules/admin/tests/routes.spec.ts

## Purpose

Guarantees that every admin route record carries an explicit `meta.access` declaration. Without this test, a route that silently loses its access level would become publicly reachable while all other tests still pass, because nothing else in the suite inspects that field. The test asserts declarations *on the route records themselves*, not on a resolved router, so it needs no locale prefix or app bootstrap.

## Key elements

- **`byName(name)`** — local helper that finds a `RouteRecordRaw` by its `name` property from the imported `routes` array.
- **`'Admin declares access: admin'`** — parameterised (`it.each`) assertion that the `Admin` route exists and its `meta.access` equals `'admin'`.
- **`'declares no route this file does not know about'`** — whitelist guard: the sorted list of all route names must equal `['Admin']`. Catches a newly added route that no one has assigned an access level to.

## Relationships

- **`src/modules/admin/routes.ts`** — the sole import target. The test reads its default-exported array of route records and asserts on their `meta` fields and the set of names. No other module or test depends on this file.

## Notes

- The access value (`'admin'`) is **hard-coded in the test** rather than read back from the route. The doc comment explains this is deliberate: deriving the expected value from the record under test would make the assertion tautological and unable to detect a missing field.
- The file lives in the admin module (not a shared/platform spec) so that deleting the admin domain doesn't break an unrelated test suite — see `docs/theory/modules.md`.
- Because it inspects raw route records, it runs without `vue-router`'s `createRouter`, locales, or guards.
