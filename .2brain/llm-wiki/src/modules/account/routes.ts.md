---
source: src/modules/account/routes.ts
sha256: 4dfd4d7ae55ac7f7e72b51fbce9272e6ef81950bae510d169f5e26adf48c541f
signature: 4dfd4d7ae55ac7f7e72b51fbce9272e6ef81950bae510d169f5e26adf48c541f
generated_at: 2026-11-10T03:25:18.119663+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/routes.ts

## Purpose

Defines the complete route table for the account module as a single `RouteRecordRaw[]` export. The kernel's router splices this array into the app-level route tree, so every login, signup, reset, verification, email-change, export, profile, and logout path is registered here. Each entry carries an `access` meta field (or none, meaning "token-only / public") that the shared route guard reads to decide whether to allow, redirect, or challenge the visitor.

## Key elements

- **`export default [...]`** — The sole export. An array of 15 route records covering guest flows (`Login`, `Signup`, `TwoFactorChallenge`, `AccountRestoreChallenge`, `PasswordResetRequest`), public token-based confirms (`PasswordResetConfirm`, `AccountSetup`, `AccountRestore`, `VerifyEmailConfirm`, `EmailChangeConfirm`, `EmailChangeUndo`, `OAuthCallback`), authenticated pages (`AccountExportDownload`, `Profile`), and the routeless `Logout` entry.
- **`access` meta values** — `'guest'` (must *not* be signed in), `'auth'` (must *be* signed in), or omitted (no session requirement; the URL token is the credential). The route guard in the kernel interprets these.
- **`Logout` route** — Has no view component. Its `component.beforeRouteEnter` hook calls `useAccountAuthStore().logout()` and returns a `Home` route location (with the `locale` param preserved). Both success and failure resolve to the same redirect.
- **`AccountSetup` reusing `PasswordResetConfirm.vue`** — Same view, but mounted with `props: { mode: 'setup' }` to switch the form into first-time-password / terms-tick mode.
- **`satisfies RouteRecordRaw[]`** — Type-checks the array against Vue Router's record shape without widening the literal, keeping per-route literal types (e.g. `access: 'guest'`) intact for downstream consumers.

## Relationships

- **`src/modules/account/module.ts`** — Imports this default export and registers the routes with the application router (the "kernel" referenced in the module docstring).
- **`src/modules/account/stores/auth.ts`** — Provides `useAccountAuthStore`, whose `logout` action is the only runtime dependency inside this file (used by the `Logout` route's `beforeRouteEnter`).
- **`src/modules/account/tests/routes.spec.ts`** — Exercises the exported array: validates route paths, names, access meta, and the Logout redirect behavior.

## Notes

- **Public vs. guest is intentional and non-obvious.** Routes like `password-reset/confirm`, `account-setup`, and `email-change/undo` deliberately omit the `access` key (rather than setting `'guest'`) because the token in the URL *is* the credential and the visitor may still hold a live session in the same browser. The `Logout` route similarly has no `access` key — it must be reachable from any state.
- **`OAuthCallback` is public** because the backend redirects an anonymous browser there before a session is established; it is not a guest-only route.
- **Route titles are i18n keys** (e.g. `'login-page.page-title'`), not display strings. The rendering layer resolves them.
- **The `Logout` component is an inline object**, not a `.vue` file. It exists solely to host the `beforeRouteEnter` guard; it renders nothing.
- **`AccountExportDownload` is `'auth'`**, not token-based: the API requires a fresh session and the path id is not a credential.
