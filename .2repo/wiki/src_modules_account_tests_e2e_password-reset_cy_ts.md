# src/modules/account/tests/e2e/password-reset.cy.ts

## Purpose

End-to-end test of the forgot-password flow. It verifies that the reset link actually emailed by the backend (read from the demo email outbox) replaces the old password, and that a fabricated token changes nothing. Both tests are gated to the demo profile only.

## Key elements

- **`describe('Password reset', …)`** — top-level suite; `beforeEach` visits `/en`, calls `cy.resetState()`, then revisits `/en` to get a clean session.
- **`it('the emailed link replaces the forgotten password')`** — happy-path spec. Steps: submit the reset request → read the email via `cy.demoEmailTo('gino@pino.it')` → follow the `?token=` URL → type a new password → then *prove* both directions at the login form (old password is rejected, new password is accepted).
- **`it('a token nobody was sent changes nothing')`** — negative spec. Visits the confirm page with a bogus token, submits a new password, asserts the success copy never appears, and confirms the original account password still works via `cy.loginAs('user')`.

## Relationships

- **`tests/support/e2e/accounts.ts`** — imports `E2E_ACCOUNTS` to reference the known pre-reset password (`E2E_ACCOUNTS.user.password`) so the "old password is dead" assertion is data-driven rather than hardcoded.

## Notes

- **Demo-only specs.** Every test calls `cy.skipUnlessDemo()`; the `cy.demoEmailTo` custom command reads from the demo backend's `/__demo/emails` outbox, so these tests are meaningless (and skipped) against any non-demo profile.
- **Enumeration-safe acknowledgement.** The reset-request form asserts the generic "If the account exists" copy, mirroring the security requirement that the response be identical whether or not the email is registered.
- **Dual-direction proof.** The happy path doesn't just assert a redirect to login; it explicitly submits the *old* password and confirms rejection before submitting the *new* password and confirming acceptance.
- **Custom commands used:** `cy.resetState()`, `cy.demoEmailTo(email)`, `cy.skipUnlessDemo()`, `cy.loginAs(role)` — all defined elsewhere in the test support layer.
