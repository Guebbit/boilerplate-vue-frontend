---
source: src/modules/account/routes.ts
sha256: f00d7c53b598d5ceafd73c575ddf05fb6df015bd46d9f89e47c66e729977c577
generated_at: 2026-10-17T00:18:18.215471+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/routes.ts

## Purpose

Defines the complete route table for the account module as a single array of `RouteRecordRaw` entries. The kernel splices this array into the app router; each entry pairs a path, a lazily-loaded view component, and a `meta.access` value that the global route guard reads to enforce guest/authed access. The file also contains one routeless entry (`Logout`) that performs its side-effect in `beforeRouteEnter` rather than rendering a view.

## Key elements

- **Default export** — an array `satisfies RouteRecordRaw[]` covering every account flow: `Login`, `Signup`, `TwoFactorChallenge`, `PasswordResetRequest`, `PasswordResetConfirm`, `AccountDeleteConfirm`, `VerifyEmailConfirm`, `EmailChangeConfirm`, `EmailChangeUndo`, `OAuthCallback`, `AccountExportDownload`, `Profile`, and `Logout`.
- **`meta.access`** — `'guest'` (login, signup, 2fa, password-reset), `'auth'` (profile, account-export), or absent (the token-based confirm pages and OAuth callback). The guard reads this field; absence means "public / no session required."
- **`Logout` entry** — has no `.vue` file. Its `component` object exposes only `beforeRouteEnter`, which calls `useAuthStore().logout()` and returns a route object `{ name: 'Home', params: { locale } }` in both success and catch branches.
- **`useAuthStore` import** (`./stores/auth.ts`) — used solely inside the `Logout` guard to obtain the `logout` action.
- **`RouteRecordRaw` type import** (`vue-router`) — used only for the `satisfies` assertion on the default export.

## Relationships

- **`src/modules/account/module.ts`** — imports this default export and splices it into the application-level router, so every entry here becomes a live route once the module is registered.
- **`src/modules/account/stores/auth.ts`** — provides the `logout()` Pinia action invoked by the `Logout` route's `beforeRouteEnter` guard.
- **`src/modules/account/tests/routes.spec.ts`** — exercises the exported array (path shape, meta values, component lazy-loaders) to guard against accidental route regressions.

## Notes

- **Public vs. guest distinction.** Routes with `access: 'guest'` *require* the visitor to be logged out. Routes with no `access` key are simply *not gated* — they are reachable by anyone, logged in or out. The token-based confirm pages (account-delete, verify-email, email-change, oauth-callback) intentionally omit `access` because the URL token is the credential and the visitor may have no session at all.
- **`Logout` return style.** The guard returns a promise resolving to a route object rather than calling the deprecated `next()` callback. Both `.then` and `.catch` resolve to `Home`; a failed logout still redirects.
- **`account-export/:id`** is the only route whose path parameter is *not* a credential — it is a server-issued export job id, and the route still requires `access: 'auth'` because the API demands a live session.
- **`satisfies` over `: RouteRecordRaw[]`.** The annotation checks shape without widening the literal types (path strings, meta keys), so typos in route names or meta fields still produce compile errors while preserving narrow types for consumers.
