# src/modules/account/tests/e2e/auth.cy.ts

## Purpose

Cypress end-to-end suite covering the full authentication lifecycle: login (including "remember me" cookie semantics), signup, the route guards that protect `/cart`, `/orders`, `/admin`, and `/users`, logout, and a live-profile-only test that exercises the cross-origin session-refresh flow (API :8085 → app :3000).

## Key elements

- **`describe('Login', …)`** – Verifies form rendering, client-side validation (invalid email, empty form), successful login redirect to home, and "remember me" behavior by asserting the `jwt` cookie `expiry` is < 1 h (unchecked) vs. > 24 h (checked).
- **`describe('Signup', …)`** – Confirms the signup form renders, password-mismatch produces a Vuetify validation message, and a valid signup redirects to `/login` (no auto-login).
- **`describe('Route guards', …)`** – Asserts unauthenticated visits to protected routes bounce to `/login`; authenticated non-admins are ejected from `/admin` and `/users`; an already-authenticated user visiting `/login` is redirected away; session survives a hard reload (F5).
- **`describe('Logout', …)`** – Single test: login → visit `/en/logout` → land on home page.
- **`describe('Live session refresh (live profile only)', …)`** – Skipped unless `cy.skipUnlessLive()` passes. Logs in as admin, loads `/orders`, then intercepts `GET ${apiUrl}/orders*` to return a one-time 401, reloads, and asserts the app recovers (stays on the list, not redirected to `/login`). Exercises the real `onResponseRejectWithRefresh → GET /account/refresh → retry` interceptor path across the origin boundary.
- **Custom commands used**: `cy.resetState()`, `cy.loginAs(role)`, `cy.skipUnlessLive()`.

## Relationships

- **`docs/tools/live-e2e.md`** – Documents the "live" Cypress profile (environment flags, origin setup). This file's `cy.skipUnlessLive()` gate and the `:8085 → :3000` cross-origin refresh test depend on that profile's configuration; run the live suite per the instructions in that doc.

## Notes

- The "remember me" tests read the **`jwt`** cookie, not the human-readable `isAuth` twin, because `session.ts` rewrites the latter as a session (non-persistent) cookie. `jwt` is `httpOnly`, readable only by Cypress.
- The live-refresh intercept is pinned to the **API origin** (`${apiUrl}/orders*`), deliberately *not* a bare `**/orders*` glob. A broader glob also matches the SPA's own document URL (`http://localhost:8085/en/orders`), which caused `cy.reload()`'s navigation to receive the 401 and render raw JSON as the page body—making the failure look identical to a broken token refresh.
- The live test uses a forced 401 + real network round-trip rather than reaching into Pinia to clear the in-memory access token, so it exercises the exact production interceptor path.
- Selectors rely on Vuetify classes (`.v-messages__message`) and `data-test` attributes (`[data-test=list-row]`) rather than CSS class names of the app itself.
