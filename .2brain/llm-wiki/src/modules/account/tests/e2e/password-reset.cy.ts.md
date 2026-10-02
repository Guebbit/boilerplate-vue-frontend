---
source: src/modules/account/tests/e2e/password-reset.cy.ts
sha256: 74398637b839a8bec46159ba6597671643756839f104ec96939a141bcd73ad4d
generated_at: 2026-10-02T12:23:25.660484+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/password-reset.cy.ts

## Purpose

Cypress end-to-end test for the full password-reset flow. It verifies that a reset link actually delivered via email (read from the demo outbox or live Mailpit) changes the credential, and that a fabricated token cannot. Both halves of the outcome are asserted at the login form: the old password stops working and the new one works.

## Key elements

- **`describe('Password reset')`** — the single test suite; `beforeEach` restores DB state (`cy.restore()`) and re-visits the locale root.
- **`it('the emailed link replaces the forgotten password')`** — full happy-path: request reset → verify enumeration-safe acknowledgement → read the email via `cy.emailTo` → confirm the `account.reset-request` template → follow the mailed link → set new password → log in with old (must fail) and new (must succeed) credentials.
- **`it('a token nobody was sent changes nothing')`** — negative path: navigates directly to `/confirm?token=a-token-nobody-issued`, submits a new password, asserts the confirm page is *still* shown (no redirect, no success copy), then proves the original password still authenticates via `cy.loginAs('user')`.
- **`seedAccount('user')`** — imported fixture; provides the canonical email/password for the seeded test user.
- **`expectMailTemplate(email, 'account.reset-request')`** — asserts the correct template was rendered.
- **`mailedLinkUrl(email)`** — extracts the reset URL from the email body for `cy.visit`.

## Relationships

- **`tests/support/e2e/scenario.ts`** — supplies `seedAccount`, the single source of truth for the seeded user's credentials and identifiers used throughout the test.
- **`tests/support/e2e/commands.ts`** — supplies `expectMailTemplate` (template assertion helper) and `mailedLinkUrl` (link extraction from email body). The file also registers the custom commands `cy.emailTo`, `cy.skipUnlessMailbox`, and `cy.loginAs` used here.

## Notes

- `cy.skipUnlessMailbox()` gates the happy-path test: if no mailbox is configured the test is skipped rather than failing. The invalid-token test has no such guard because it never reads an email.
- The test deliberately does **not** hard-code the reset URL; it reads the link from the delivered email to prove the actually-mailed link works (including in a live SMTP run via Mailpit).
- The acknowledgement copy is asserted as *"If the account exists"* to lock in the enumeration-safe (same-response-for-existing-and-non-existing) behaviour.
- `beforeEach` calls `cy.restore()` *between* two `cy.visit('/en')` calls — the first visit primes the session/locale, the restore resets the DB, the second visit re-establishes state for the test.
