# src/modules/account/tests/e2e/auth.cy.ts

## Purpose

Cypress end-to-end test suite covering the full authentication surface: login, signup, route-guard redirects for protected and admin-only routes, logout, and a live-profile-only case that exercises the cross-origin (`:8085 → :3000`) session-refresh path. It ensures the user-facing auth contract (form rendering, validation, redirects, cookie lifetimes) stays intact as the app evolves.

## Key elements

- **`describe('Authentication')`** — Top-level suite; each inner suite runs after `cy.visit('/en')` + `cy.resetState()`.
- **`describe('Login')`** — Asserts form rendering, email/empty-field validation errors, successful login redirect to `#home-page`, and verifies the `jwt` cookie expiry stays under ~1 h without "remember me" vs. over 24 h with it.
- **`describe('Signup')`** — Asserts form rendering, password-mismatch validation, and that a successful signup redirects to `/login` (no auto-login).
- **`describe('Route guards')`** — Confirms unauthenticated users are bounced from `/cart`, `/orders`, `/users` to login; authenticated non-admins are bounced from `/admin` and `/users` to `#home-page`; authenticated users are bounced *away* from `/login`; session survives an F5 reload.
- **`describe('Logout')`** — Visits `/en/logout` and asserts redirect to `#home-page`.
- **`describe('Live session refresh (live profile only)')`** — Gated by `cy.skipUnlessLive()`. Forces a one-time `401` on the first `GET {apiUrl}/orders*` request, then asserts the app's interceptor refreshes the token across the origin boundary and re-renders the order list instead of redirecting to login.
- **`E2E_ACCOUNTS`** (imported) — Provides pre-seeded `admin` and `user` credentials used by login, route-guard, and refresh tests.

## Relationships

- **`tests/support/e2e/accounts.ts`** — Supplies `E2E_ACCOUNTS` (typed account objects with `email`/`password` for `admin` and `user` roles) consumed by the login, route-guard, and live-refresh suites.

## Notes

- The live-refresh test pins its `cy.intercept` glob to `${apiUrl}/orders*` rather than `**/orders*` to avoid intercepting the SPA's own document navigation at `:8085/en/orders`; a broader glob once caused the forced-401 to hit the HTML document request, rendering JSON as the page body and masking the real failure.
- "Remember me" is asserted via the `jwt` cookie's `expiry` field (readable by `cy.getCookie` because it is `httpOnly`); the readable `isAuth` twin is deliberately not used.
- The refresh test drives the real interceptor path (`onResponseRejectWithRefresh → GET /account/refresh → retry`) via a network-level 401 rather than clearing Pinia state, so it exercises the same code a production user would hit.
