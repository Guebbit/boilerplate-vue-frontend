# src/modules/account/routes.ts

## Purpose

Defines the complete route table for the account module — login, signup, password reset, email verification, account deletion, profile, and logout. It is a default export of a single `RouteRecordRaw[]` that the kernel splices into the app router. Each entry carries an `access` level (`guest` or `auth`) in its `meta` that the global route guard enforces.

## Key elements

- **Default export (`RouteRecordRaw[]`)** — eight route entries covering the full account lifecycle. All views are lazy-loaded via `() => import(...)`.
- **`meta.access`** — `'guest'` (login, signup, both password-reset steps) or `'auth'` (profile). Two confirm routes intentionally omit it (see Notes).
- **`meta.title`** — i18n key (e.g. `'login-page.page-title'`) consumed by the layout or guard for document title.
- **`Logout` entry** — not a real view component. The `component` is an inline object whose sole method is `beforeRouteEnter`, which calls `useAuthStore().logout()` and returns a redirect to the `Home` route, preserving the `locale` param. Both the success and failure paths resolve to the same destination.

## Relationships

- **`src/modules/account/module.ts`** — imports this file's default export and registers the routes with the app router (the "kernel" splice mentioned in the module docstring).
- **`src/modules/account/tests/routes.spec.ts`** — unit-tests the route table (paths, names, meta fields, and likely the `Logout` guard behavior).
- **`@/modules/account/stores/auth.ts`** — provides `useAuthStore` whose `logout` action is the only runtime dependency exercised by this file (in the `Logout` guard).

## Notes

- The two confirm routes (`AccountDeleteConfirm`, `VerifyEmailConfirm`) deliberately have **no** `access` field. The token carried in the URL *is* the credential; the visitor is by definition unauthenticated. Adding `access: 'guest'` would be redundant but the omission signals "no auth gate" to the guard.
- `Logout`'s `beforeRouteEnter` returns a **promise** rather than calling the deprecated `next(...)` callback (Vue Router 4). Don't "modernize" it back to the callback form.
- Route `name`s are PascalCase except `PasswordResetRequest` / `PasswordResetConfirm`, which use the full phrase — match them exactly when using `router.push({ name: ... })`.
