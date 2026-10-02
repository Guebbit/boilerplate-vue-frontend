---
source: src/modules/account/tests/e2e/auth.cy.ts
sha256: 795398673a771d4d550fc13e4229dce483215ccdbc64dbec9e0c6d65b485f69a
generated_at: 2026-10-02T12:22:41.818726+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/auth.cy.ts

## Purpose

Cypress end-to-end suite covering the full authentication surface: login (form, validation, success, remember-me cookie lifetime), signup (validation, unverified-role entry), route guards (`/cart`, `/orders`, `/admin`, `/users`), logout, in-tab user switching, and a live-profile-only session-refresh test that exercises the cross-origin (`:8085 → :3000`) refresh path.

## Key elements

- **`describe('Login')`** – verifies form rendering, email/password validation errors, successful login + redirect, and two cookie-lifetime cases: unchecked "remember me" yields a session cookie (no `expiry`), checked yields a long-lived cookie. Reads the httpOnly `jwt` cookie directly via `cy.getCookie`.
- **`describe('Signup')`** – form rendering, password-mismatch error, successful signup that lands the user on `#home-page` with a `[data-test=verify-banner]` (unverified is a role, not a blocking gate).
- **`describe('Route guards')`** – unauthenticated users are bounced to `/login` from `/cart`, `/orders`, `/users`; authenticated non-admins are bounced away from `/admin` and `/users`; authenticated users are redirected off the login page; session survives `cy.reload()`.
- **`describe('Logout')`** – logout redirects to home; `cy.switchUser('user')` (admin → user) is verified in the *same* tab by planting a `window.__switchUserMarker` before the switch and asserting it still exists after, plus checking admin/user menu elements.
- **`describe('Live session refresh (live profile only)')`** – gated by `cy.skipUnlessLive()`. Intercepts `POST {apiUrl}/orders/search` to force a one-time 401, then asserts the app's interceptor calls `GET {apiUrl}/account/refresh` and retries the search successfully, proving the refresh cookie crossed the origin boundary.
- **`beforeEach` (top-level)** – visits `/en` and calls `cy.restore()` to reset app state between suites.

## Relationships

- **`tests/support/e2e/scenario.ts`** — provides `seedAccount(role)` which returns pre-seeded credentials (`{ email, password, … }`) for named roles (`'admin'`, `'user'`). Every test that needs real login data calls this rather than hardcoding values.

## Notes

- All custom commands (`cy.loginAs`, `cy.switchUser`, `cy.restore`, `cy.skipUnlessLive`) are defined in the Cypress support layer, not in this file.
- The live-refresh test pins intercepts to `cy.env(['apiUrl'])` to avoid accidentally matching the app's own document routes (e.g. `GET /en/orders`).
- The "remember me" tests deliberately inspect the `jwt` cookie's `expiry` property rather than any readable flag, because the cookie is httpOnly and only Cypress (not in-page JS) can read it.
- The switchUser test's `__switchUserMarker` is a same-technique marker as used in `resilience.cy.ts` to detect unintended full page loads.
