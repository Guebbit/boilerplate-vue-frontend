---
source: src/modules/account/tests/routes.spec.ts
sha256: a4c2cd545ff76615a6f5aeeca1c6b507d03a5f636cfb17f376d378ee740de219
generated_at: 2026-10-17T00:26:28.866085+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/routes.spec.ts

## Purpose

Vitest spec that pins the `meta.access` value declared on every account route by reading the module's raw route records directly (no locale prefix, no resolved router). It guarantees two things: each named route carries the expected access level, and no new route has been added without an explicit access decision.

## Key elements

- **`byName(name)`** — Helper that looks up a route in the imported `routes` array by its `name` property.
- **`it.each` table (13 rows)** — Asserts `meta.access` for each route: `'guest'` (Login, Signup, TwoFactorChallenge, PasswordResetRequest, PasswordResetConfirm), `'auth'` (AccountExportDownload, Profile), or `undefined` (AccountDeleteConfirm, VerifyEmailConfirm, EmailChangeConfirm, EmailChangeUndo, OAuthCallback, Logout).
- **`'declares no route this file does not know about'`** — Compares the sorted list of all route names in the module against the hard-coded list above; fails if a new route is added without a corresponding entry.

## Relationships

- **`src/modules/account/routes.ts`** — Direct import; the sole source under test. This spec reads its exported `routes` array (an `RouteRecordRaw[]`) and asserts on each record's `name` and `meta.access`. No other module is touched.

## Notes

- This spec and the router-level spec are complementary: this file proves the declarations are *present*; the router spec proves enforcement is *wired up*. Neither subsumes the other.
- `undefined` in the access column is intentional (route is public), not a missing assertion — the test explicitly asserts `.toBe(undefined)`.
- The "no unknown route" guard means adding a route to `routes.ts` requires a matching row in both the `it.each` table **and** the hard-coded name list, or the test fails.
- Per the module doc comment, the test deliberately avoids a resolved router instance so it needs neither a locale prefix nor the rest of the app to boot.
