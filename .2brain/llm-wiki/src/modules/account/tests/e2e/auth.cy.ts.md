---
source: src/modules/account/tests/e2e/auth.cy.ts
sha256: 5ba5ac5707d813110f12c2ec9735e71434d017b02bb7bb92b95742902a6c054a
generated_at: 2026-10-17T00:21:38.912593+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/auth.cy.ts

## Purpose

Cypress end-to-end spec covering the full authentication lifecycle: login form (render, validation, success, "remember me" cookie expiry), signup (render, password mismatch, successful unverified signup), route-guard redirects for `/cart`, `/orders`, `/admin`, `/users`, `/login`, logout, cross-account user switching without a page reload, and a live-profile-only session-refresh test that exercises the `:8085 → :3000` cross-origin cookie boundary after a forced 401.

## Key elements

- **`describe('Authentication')`** – top-level suite; `beforeEach` visits `/en` and calls `cy.restore()`.
- **`describe('Login')`** – six tests: form rendering, invalid-email validation, empty-form validation, successful login + redirect, session-cookie expiry (no `expiry` = browser-session), and "remember me" producing a multi-day `expiry` on the `__Host-session` cookie.
- **`describe('Signup')`** – three tests: form rendering, password-mismatch error, and successful signup landing on the home page with a `[data-test=verify-banner]` (unverified is a role, not a blocking state).
- **`describe('Route guards')`** – seven tests verifying: `/cart` is public (guest cart visible, no redirect), `/orders` and `/users` redirect unauthenticated users to `/login`, an authenticated user is bounced off `/login`, a non-admin is bounced off `/admin` and `/users` to the home page, and auth survives `cy.reload()`.
- **`describe('Logout')`** – two tests: standard logout redirect to home, and `cy.switchUser('user')` after `cy.loginAs('admin')` proving the same `window` persists (via a planted `__switchUserMarker`) and that admin-only UI (`[data-test=admin-menu]`) is replaced by user UI (`[data-test=user-menu]`).
- **`describe('Live session refresh (live profile only)')`** – one `function`-scoped test (needs `this.skip()` for Mocha). Gated by `cy.skipUnlessLive()` and `skipUnlessSessionMode(this, 'jwt')`. Intercepts `POST {apiUrl}/orders/search` to reply 401 once, then asserts the retry succeeds (200), that at least two `POST /account/refresh` calls were made, and that the app does not bounce to `/login`.

## Relationships

- **`tests/support/e2e/scenario.ts`** – imports `seedAccount`, which returns pre-seeded credential objects (`.email`, `.password`) used in the Login tests.
- **`tests/support/e2e/harness.ts`** – imports `skipUnlessSessionMode`, called with Mocha's `this` context and the mode string `'jwt'` to skip the live-refresh test in `cookie` mode.

## Notes

- The live-refresh test uses a plain `function` (not an arrow) so it can call `this.skip()` via `skipUnlessSessionMode`. Arrow functions would lose the Mocha test context.
- `seedAccount('admin')` and `seedAccount('user')` are the canonical fixture sources; the Signup test hard-codes `newuser@example.com` because it creates a *new* account.
- The "remember me" test asserts on `__Host-session` (httpOnly) rather than a readable `isAuth` flag, because Cypress reads httpOnly cookies but page scripts cannot.
- The forced-401 intercept is pinned to `${apiUrl}/orders/search` (not a bare glob) to avoid accidentally matching the app's own `/en/orders` document route.
- The `switchUser` test's window-marker technique (plant a flag, perform the switch, assert the flag survived) is the same pattern used in `resilience.cy.ts` to detect cross-reload state leakage.
- All route-guard tests clear cookies first (`cy.clearCookies()`) or use `cy.loginAs` to set a known identity before navigating.
