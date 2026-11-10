---
source: tests/e2e/specs/journeys/op11-a-moderator-bans-a-customer.cy.ts
sha256: f0ff9cc04fe098ab0fc9895c5e78a2da0cf37ee8e3c9154c4b704249cea0c103
signature: e90b382acd0381017dc7d33fb176e32e051edb3f2a5dee2f99024e6578624013
generated_at: 2026-11-10T07:12:03.839005+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/op11-a-moderator-bans-a-customer.cy.ts

## Purpose

E2E test (Cypress) for journey OP11: a moderator bans a customer by switching their account off from the user page, then reactivates it. Verifies that the ban takes effect immediately on the customer's next API call (no token-grace period), that a fresh login is refused while banned, and that reactivation restores access without leaving ghost sessions.

## Key elements

- **`setAccessActive(userId, active)`** – Navigates to the user page, opens the "manage access" dialog, toggles the active checkbox to the desired state, and confirms via the two-step (continue → confirm) flow. Intercepts the `POST /users/:id/(de)activate` call and asserts a 200.
- **`submitCustomerLogin()`** – Reads the seeded `user` account's email/password via `cy.accountOf('user')`, fills the login form, and submits.
- **`describe('OP11 · A moderator bans a customer')`** – Single test case that exercises the full ban → refuse → reactivate → re-login cycle. Uses `loginDevice` to simulate the customer on a separate server-side device while the page session belongs to the moderator.

## Relationships

- **`tests/support/e2e/harness.ts`** – Provides `loginDevice` (creates a server-side auth device for the customer) and `requestAsDevice` (issues a request on that device's session) so the customer's "other device" can be asserted without stealing the page session from the moderator.
- **`tests/support/e2e/login-challenge.ts`** – Provides `answerChallengePage` to solve the TOTP authenticator step when the moderator re-logs in to reactivate the account.

## Notes

- The file declares `requires-module: account, users` (top-of-file comment); the test seed must have both modules provisioned.
- The customer's second device is a *server-side* login (`loginDevice`), not a browser tab — the page session is the moderator's throughout.
- After the moderator logs out to test the login-refusal step, they must re-authenticate (with TOTP) before reactivating; `answerChallengePage` is needed for that.
- The final assertion checks that exactly **one** session appears in the sessions list, confirming the ban cleared any server-side session state.
- The access toggle uses `{ force: true }` on `check`/`uncheck`, implying the input may not be in a normally-interactable state (e.g., partially covered or mid-transition).
