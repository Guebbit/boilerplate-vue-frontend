# src/modules/realtime/tests/routes.spec.ts

## Purpose

Table-driven test that asserts every route in the realtime module carries an explicit `meta.access` value, and enforces a closed list so that adding a new route without an access decision causes a test failure. It validates the *declarations* exist on the route records; the router-level spec separately proves enforcement is attached.

## Key elements

- **`byName(name)`** — helper that looks up a route record in the imported `routes` array by its `name` field.
- **`it.each([['RealtimePlayground', 'admin']])`** — table-driven assertion that each listed route is defined and its `meta.access` matches the expected string. Values are written out explicitly (not derived) so a silent loss of `meta.access` is caught.
- **Closed-list test (`'declares no route this file does not know about'`)** — compares the sorted set of all route names in `routes` against the sorted expected set `['RealtimePlayground']`. Any new route added to `../routes` without a corresponding entry here will fail.

## Relationships

- **`src/modules/realtime/routes.ts`** — the sole subject under test; this spec imports its default export (`routes`) and asserts on its `name` and `meta.access` fields. No other runtime interaction.
- **`vue-router`** — type-only import of `RouteRecordRaw` for the `byName` return type.
- **`vitest`** — provides `describe`, `expect`, `it` for the test harness.

## Notes

- The test intentionally avoids importing the locale prefix or the rest of the app; it tests only the module's own route records in isolation.
- Access values are hard-coded in the table rather than derived from a constant, making any accidental omission of `meta.access` visible as a `toBe('admin')` failure rather than passing silently.
- When adding a new route to `routes.ts`, the closed-list test will fail until the new name is added to both the `it.each` table and the expected-name array in the closed-list test.
