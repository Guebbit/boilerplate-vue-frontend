# src/modules/account/tests/routes.spec.ts

## Purpose

Guarantees that every account route explicitly declares its `meta.access` value and that no route is added to the module without an access decision. It asserts against the raw route records exported by the module (not a resolved router), so it runs without locale prefixes or the rest of the app.

## Key elements

- **`byName(name)`** — small lookup helper that finds a route record by its `name` in the imported `routes` array.
- **`it.each([...])('%s declares access: %s')`** — table-driven assertion that pins the expected `meta.access` (`'guest'`, `'auth'`, or `undefined`) for each named route: Login, Signup, PasswordResetRequest, PasswordResetConfirm, AccountDeleteConfirm, VerifyEmailConfirm, Profile, Logout.
- **`it('declares no route this file does not know about')`** — completeness guard: the sorted list of all route names must exactly match the eight names enumerated above. Catches a new route added without an access decision.

## Relationships

- **`src/modules/account/routes.ts`** — imports the default-exported route array (`routes`) and reads each record's `name` and `meta.access`. This is the sole dependency; no router instance or app context is needed.

## Notes

- The expected access values are deliberately hard-coded rather than derived from the records under test, so the test fails if a value silently changes instead of passing vacuously.
- This spec proves declarations *exist*; a separate router-level spec is responsible for proving enforcement is *attached*. Both are needed.
- The file intentionally lives in the account module (not a platform-wide spec) so that deleting the domain does not break an unrelated spec — see `docs/theory/modules.md`.
