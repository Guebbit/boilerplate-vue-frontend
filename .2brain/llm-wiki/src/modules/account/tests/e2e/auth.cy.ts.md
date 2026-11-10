---
source: src/modules/account/tests/e2e/auth.cy.ts
sha256: 1db44c8084e685661128ee7c82b3534fd9dc56a01ceb0702ef7e3cd5f67042d9
signature: b0b74c0764d3d49947094c9c1fd6f27525cb412cb501d3ad9ef6c0517c45f6d0
generated_at: 2026-11-10T03:32:30.031589+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/auth.cy.ts

## Purpose

Cypress end-to-end suite covering the full authentication lifecycle: login (form validation, TOTP challenge, remember-me cookie), signup (password match, unverified session start), route guards for `/cart`, `/orders`, `/admin`, `/users`, logout, in-tab user switching, and a live-profile-only session-refresh case that exercises the cross-origin (`:8085 → :3000`) refresh flow through a forced 401.

## Key elements

- **`signInAsAdmin(remember?)`** — Module-private helper. Types the admin email/password into the login form, optionally checks "remember me", submits, then answers the TOTP challenge. Reads the account via `cy.accountOf('admin').then(…)` *after* the test's reset so the data is available.
- **`describe('Login')`** — Form rendering, email/password validation, successful login redirect, and two cookie-expiry assertions on `__Host-session` (session vs. 30-day).
- **`describe('Signup')`** — Form rendering, password-mismatch error, successful signup landing on home with a `verify-banner`.
- **`describe('Route guards')`** — Unauthenticated access to guest vs. protected routes, authenticated-away-from-login, role-gated `/admin` and `/users`, and session survival across `cy.reload()`.
- **`describe('Logout')`** — Redirect to home, and a user-switch test that plants a `window.__switchUserMarker` before `cy.switchUser('user')` to prove no page reload occurred.
- **`describe('Live session refresh (live profile only)')`** — Single test (gated by `cy.skipUnlessLive()` and `skipUnlessSessionMode(this,'jwt')`) that intercepts `POST /orders/search` to reply a one-time 401 via `rejectEnvelope`, then asserts the interceptor's refresh path fires and the retry succeeds.

## Relationships

| Neighbor | Interaction |
|---|---|
| `tests/support/e2e/harness.ts` | Imports `skipUnlessSessionMode`; used in the live-refresh test to bail out when running under the `cookie` session mode (no cross-origin refresh to test). |
| `tests/support/e2e/login-challenge.ts` | Imports `answerChallengePage`; called inside `signInAsAdmin` to resolve the TOTP prompt after form submission. |
| `tests/support/e2e/envelope.ts` | Imports `rejectEnvelope`; used to craft the synthetic `401 UNAUTHORIZED` problem-envelope response that triggers the refresh interceptor. |

`tests/support/problem-stub.ts` appears in the dependency graph but is **not** imported or referenced in this file.

## Notes

- `signInAsAdmin` defers the account read into a `.then()` because a live run has no seed data until `cy.restore()` (the `beforeEach` reset) completes; a synchronous read in the test body would be empty.
- The remember-me assertions read `__Host-session` (httpOnly) via `cy.getCookie` rather than the JS-visible `isAuth` twin — Cypress can read httpOnly cookies, a page script cannot.
- The live-refresh test uses a **function** declaration (not arrow) so Mocha's `this.skip()` works inside `skipUnlessSessionMode`.
- The `cy.intercept` for `/orders/search` is pinned to `${apiUrl}/orders/search` (from `cy.env(['apiUrl'])`) to avoid matching the app's own `/en/orders` document route; the list page issues `POST /orders/search`, never `GET /orders`.
- The user-switch test relies on `cy.switchUser` performing logout-then-login in the **same tab** (no `cy.visit`/`cy.reload`), so the planted `window` marker surviving is the proof of a single live document.
