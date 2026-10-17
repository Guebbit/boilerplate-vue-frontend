---
source: tests/e2e/specs/journeys/op11-a-moderator-bans-a-customer.cy.ts
sha256: f23e1d6839c6f4c518dd380b4801ff7b7b63e78c76832eb8a3f781c1e68d2757
generated_at: 2026-10-17T02:18:54.326222+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op11-a-moderator-bans-a-customer.cy.ts

## Purpose

End-to-end (Cypress) journey test for **OP11**: a moderator disables a customer's account via the user management UI. It verifies that the ban takes effect immediately (the next API call from an already-authenticated device is rejected with 401, and a fresh login is refused), and that reactivating the account restores access.

## Key elements

- **`setAccessActive(userId, active)`** — Navigates to `/en/users/{userId}`, opens the "manage access" dialog, toggles the active checkbox (`force: true`), clicks through the two-step confirmation, and asserts the PATCH returns 200.
- **`submitCustomerLogin()`** — Fetches the seeded `user` account's credentials, visits `/en/login`, fills in the email/password fields, and submits the form.
- **`describe('OP11 · …')`** — Single `it` block that, in sequence:
  1. Logs the customer in on a separate device and confirms a 200 on `GET /account`.
  2. Logs in as moderator, calls `setAccessActive(customerId, false)`.
  3. Re-issues `GET /account` on the customer device, expects 401.
  4. Attempts a fresh login, asserts the `login-error` element is visible and the URL still contains `/login`.
  5. Logs in as moderator again, calls `setAccessActive(customerId, true)`.
  6. Logs the customer in fresh, asserts successful login (URL no longer `/login`, `user-menu` visible).

## Relationships

- **`tests/support/e2e/harness.ts`** — Provides `loginDevice` (creates a server-side session for a seeded account, returning a device handle) and `requestAsDevice` (issues an HTTP request using that device's credentials, returning the response object). Both are used to simulate the customer's "other device" independently of the browser session, which belongs to the moderator.

## Notes

- The `requires-module: account, users` comment at the top of the file signals this test needs those feature modules' seed data to be present; the test harness (`cy.restore()`) re-seeds between runs.
- `force: true` on the checkbox `check`/`uncheck` calls is required because the input may be visually disabled or partially obscured inside the dialog; without it Cypress would fail the actionability check.
- The test does **not** wait for token expiry — the design intent (documented in the file's header comment) is that the backend re-reads account status on every request, so the ban is instantaneous. The 401 assertion on the *same* device session confirms this.
- The moderator re-login step in the middle of the test is needed because the earlier `cy.logout()` (used to test the refused customer login) logs out the *current* browser session (the moderator's), so a fresh moderator login must be performed before reactivating.
