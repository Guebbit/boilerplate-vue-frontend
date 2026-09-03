# src/modules/account/tests/routes.spec.ts

## Purpose

Pins the `meta.access` value each account route declares, asserting directly against the module's raw route records (not a resolved router). Exists to guarantee that a route silently losing its `meta.access` — making it indistinguishable from a public route — is caught by CI. It complements the router-level spec, which proves enforcement is *attached*; this proves the declarations are *there*.

## Key elements

- **`byName(name)`** — helper that looks up a single `RouteRecordRaw` from the imported `routes` array by its `name` field.
- **`describe('account route access')`** — the sole suite. Contains two tests:
  - A parameterized `it.each` asserting each named route's `meta.access` equals an explicitly written expected value (`'guest'`, `'auth'`, or `undefined`).
  - A completeness test that the *set* of route names in `routes` exactly matches the nine names listed in the file, so a newly added route without an access decision fails the suite.

## Relationships

- **`src/modules/account/routes.ts`** — sole dependency. This spec imports its default export (the `routes` array) and reads each entry's `name` and `meta.access`. It does not mount a router or touch the rest of the app.

## Notes

- Expected access values are hard-coded literals, never derived from the source, so a refactoring that drops or renames a `meta.access` field is detected immediately.
- The completeness test (`declares no route this file does not know about`) uses `toSorted()` on both sides, so order in the array does not matter — but *adding* a route without adding it to the expected list will fail the test.
- `undefined` access (e.g. `OAuthCallback`, `Logout`) means "no `meta.access` key at all" (truly public), not a string value. The assertion uses `toBe(undefined)` via optional chaining, so both a missing key and an explicit `undefined` pass.
