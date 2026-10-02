---
source: src/modules/account/tests/routes.spec.ts
sha256: c595005d63f039b92cb33483cb3179bb31b4c2c734fa13a98891d996f9643212
generated_at: 2026-10-02T12:31:04.006797+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/routes.spec.ts

## Purpose

Pins the `meta.access` value declared on every account route by asserting them directly against the module's route records (no resolved router needed). Its job is to guarantee that a route which silently loses `meta.access` is caught immediately, since that would make it indistinguishable from a public route.

## Key elements

- **`byName(name)`** — local helper that looks up a route in the imported `routes` array by its `name` field.
- **`'account route access' > '%s declares access: %s'`** — parameterized (`it.each`) test asserting the exact `meta.access` value for all 11 named routes. Values are hard-coded (`'guest'`, `'auth'`, or `undefined`) rather than derived, so a missing or changed declaration fails the test.
- **`'account route access' > 'declares no route this file does not know about'`** — exhaustive guard: compares the sorted list of all route names in `routes` against the hard-coded list above. Catches any new route added without an explicit access decision.

## Relationships

- **`src/modules/account/routes.ts`** — sole import. Provides the `routes` array (`RouteRecordRaw[]`) that this spec reads. The test intentionally inspects the raw records *before* any router resolution, so no other app infrastructure is involved.

## Notes

- Routes expected to have `undefined` access (AccountDeleteConfirm, VerifyEmailConfirm, EmailChangeConfirm, OAuthCallback, Logout) are deliberately public; `undefined` is a meaningful, expected value here, not an oversight.
- This spec complements (not duplicates) a separate router-level spec: this file proves the declarations *exist*; the router spec proves enforcement is *attached*.
- Colocation with the module is intentional (see `docs/theory/modules.md`): the test is a fact about this domain, not a global integration check.
- The hard-coded expected list is repeated in two places (the `it.each` table and the exhaustive-name assertion). Both must be updated together when a route is added or removed.
