---
source: src/modules/account/routes.ts
sha256: 3d9259b041c4629dbe059a88f1ace2adf51a54c179eadf3fe868945ff0640a62
generated_at: 2026-10-02T12:16:32.007685+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/routes.ts

## Purpose

Defines the complete route table for the account module — a single array of `RouteRecordRaw` entries covering all authentication and identity-management flows (login, signup, 2FA, password reset, email verification, account deletion, OAuth callback, profile, and logout). The array is the sole default export and is spliced into the application router by the kernel via the account module.

## Key elements

- **Default export (`RouteRecordRaw[]`)** — The route table. Every entry uses a lazy `() => import(...)` component loader pointing at a view under `@/modules/account/views/`.
- **Guest routes** (`access: 'guest'`): `Login`, `Signup`, `TwoFactorChallenge`, `PasswordResetRequest`, `PasswordResetConfirm` — the route guard blocks signed-in users.
- **Public / token-credential routes** (no `access` key): `AccountDeleteConfirm`, `VerifyEmailConfirm`, `EmailChangeConfirm`, `OAuthCallback` — the URL token is the credential; the visitor is expected to be unauthenticated.
- **Auth route** (`access: 'auth'`): `Profile` — requires an active session.
- **`Logout` entry** — A routeless "component" object whose `beforeRouteEnter` hook calls `useAuthStore().logout()` and returns a redirect to `Home` (preserving the `locale` param). No view is rendered.

## Relationships

- **`src/modules/account/module.ts`** — Imports the default export from this file and registers the routes with the application router (the "kernel" referenced in the module doc comment).
- **`src/modules/account/tests/routes.spec.ts`** — Consumes the default export to assert route paths, names, access levels, and the logout redirect behavior.
- **`src/modules/account/stores/auth.ts`** — `useAuthStore` is imported here exclusively for the `Logout` entry's `beforeRouteEnter` handler.

## Notes

- Routes without an `access` key are intentionally public; the inline comments explain that the emailed/OAuth token is the credential, not a session. Adding `access: 'guest'` to those routes would break the flow.
- The `Logout` entry does **not** use the `next(...)` callback (deprecated in Vue Router 4); it returns the destination object directly from `beforeRouteEnter`.
- Type safety relies on `satisfies RouteRecordRaw[]` rather than an explicit annotation, so individual entries keep their inferred literal types while still conforming to the array contract.
- `title` values are i18n keys (e.g. `login-page.page-title`), not literal strings — resolve them through the translation layer, not the route meta directly.
