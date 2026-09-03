# src/modules/account/routes.ts

## Purpose

Defines the route table for the account module — a single default-exported `RouteRecordRaw[]` covering all auth flows (login, signup, password reset, email verification, account deletion, OAuth callback) plus the authenticated profile page and a routeless `Logout` entry. The kernel splices this array into the app router; each entry's `meta.access` field is what the route guard reads to gate access.

## Key elements

- **Default export** — an array of nine route records. All component imports are lazy (`() => import(...)`).
- **Guest routes** (`meta: { access: 'guest' }`) — `Login`, `Signup`, `PasswordResetRequest`, `PasswordResetConfirm`.
- **Public routes** (no `access` key) — `AccountDeleteConfirm`, `VerifyEmailConfirm`, `OAuthCallback`. The token in the URL *is* the credential; the visitor is anonymous by definition.
- **Authed route** (`meta: { access: 'auth' }`) — `Profile`.
- **`Logout` entry** — has no `.vue` component. The `component` object carries only a `beforeRouteEnter` hook that calls `useAuthStore().logout()` and returns a redirect to `Home` (preserving `params.locale`). Returns the destination object rather than calling the deprecated `next(...)` callback.

## Relationships

- **`src/modules/account/module.ts`** — imports this default export and registers the routes with the application router (the "kernel" splice mentioned in the module doc).
- **`src/modules/account/tests/routes.spec.ts`** — unit-tests the route table (paths, names, meta, guard access levels).
- **`@/modules/account/stores/auth.ts`** — the `useAuthStore` composable used inside the `Logout` `beforeRouteEnter` hook to invoke `logout()`.

## Notes

- `AccountDeleteConfirm`, `VerifyEmailConfirm`, and `OAuthCallback` deliberately omit `access` from `meta`; the route guard treats a missing `access` as "public". Do not add `access: 'guest'` to them — that would block already-logged-in users following a token link.
- `OAuthCallback` path is `oauth/callback` (locale-prefixed by the parent router). A separate, locale-less `/oauth/callback` shell exists in `router/index.ts` for the backend's raw redirect; it forwards here.
- The `Logout` route's `beforeRouteEnter` returns a Promise resolving to a route object in **both** the `.then` and `.catch` branches — logout failure still redirects to Home.
