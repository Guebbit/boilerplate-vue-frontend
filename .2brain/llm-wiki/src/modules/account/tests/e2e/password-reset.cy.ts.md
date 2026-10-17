---
source: src/modules/account/tests/e2e/password-reset.cy.ts
sha256: e866aaf8101d4b9a5de1c8325ee8e327dffe50a2a69e145313733795884ace62
generated_at: 2026-10-17T00:22:00.758910+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/password-reset.cy.ts

## Purpose

Cypress end-to-end suite for the forgot-password flow. It verifies the full reset round-trip by reading the actual link from the demo backend's email outbox (or Mailpit in live mode) rather than constructing a known URL, then proves both halves of the outcome at the login form: the old password is dead and the new one is live. A second case confirms a fabricated token changes nothing.

## Key elements

- **`describe('Password reset')`** – top-level suite; `beforeEach` performs `cy.visit('/en')` → `cy.restore()` → `cy.visit('/en')` to reset demo state between tests.
- **`it('the emailed link replaces the forgotten password')`** – happy-path test, gated by `cy.skipUnlessMailbox()`. Steps: submit reset request → assert enumeration-safe acknowledgement → read email via `cy.emailTo` → follow `mailedLinkUrl` → type new password twice → submit → assert login form appears → verify old password is rejected → verify new password is accepted and redirects to `#home-page`.
- **`it('a token nobody was sent changes nothing')`** – negative test. Navigates directly to `/en/password-reset/confirm#token=a-token-nobody-issued`, attempts a reset, asserts the confirm page is still visible (no redirect), the success copy is absent, and the original password still logs in via `cy.loginAs('user')`.

## Relationships

- **`tests/support/e2e/scenario.ts`** – imports `seedAccount`, which supplies the canonical test-account email and pre-reset password used throughout the suite.
- **`tests/support/e2e/commands.ts`** – imports `expectMailTemplate` (asserts the received email's template name matches `'account.reset-request'`) and `mailedLinkUrl` (extracts the reset URL from the email body so the test follows the real link).

## Notes

- The happy-path test is **skipped** when neither a demo outbox nor a Mailpit instance is reachable (`cy.skipUnlessMailbox`), so CI runs without mail infrastructure still pass.
- The fake-token test encodes the token as a **hash fragment** (`#token=…`), not a path parameter—this mirrors how the app reads it and means no server-side 404 is expected.
- The enumeration-safe copy ("If the account exists") is asserted verbatim; changing that string in the UI will break this test even if the reset flow still works.
- `cy.restore()` in `beforeEach` is a custom command (from `commands.ts`) that resets demo-backend state; without it the second test's "old password still works" assertion could be contaminated by the first test's reset.
