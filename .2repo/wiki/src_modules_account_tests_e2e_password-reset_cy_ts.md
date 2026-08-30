# src/modules/account/tests/e2e/password-reset.cy.ts

## Purpose

End-to-end test for the forgot-password flow. It verifies the full round-trip: requesting a reset link, extracting the real token from the demo backend's email outbox, confirming a new password, and proving at the login form that the old password no longer works while the new one does. A second case confirms that a fabricated token changes nothing.

## Key elements

- **`describe('Password reset')`** — the top-level suite; `beforeEach` visits `/en`, calls `cy.resetState()`, then revisits `/en` to clear session cookies.
- **Test: "the emailed link replaces the forgotten password"** — happy path. Submits the request form for `gino@pino.it`, reads the token via `cy.demoEmailTo('gino@pino.it')`, navigates to `/en/password-reset/confirm?token=…`, types the new password into both fields, then asserts login behaviour in both directions (old password → stays on `/login`; new password → lands on `#home-page`).
- **Test: "a token nobody was sent changes nothing"** — negative path. Uses a hard-coded bogus token, confirms the success copy never appears, then logs in with the original `user` account to prove the password was untouched.
- **`cy.demoEmailTo(address)`** — custom command that fetches the latest email for `address` from the demo backend's `/__demo/emails` outbox and returns `{ template, token }`.
- **`cy.skipUnlessDemo()`** — guards every test so they only run against the demo profile.

## Relationships

No external graph neighbours are recorded. The file depends entirely on custom Cypress commands (`cy.demoEmailTo`, `cy.resetState`, `cy.skipUnlessDemo`, `cy.loginAs`) and the demo backend's `/__demo/emails` endpoint; it does not import any project source modules.

## Notes

- **Demo-only.** The email outbox is a demo-backend artifact; against a live deployment the email goes through a real queue the browser cannot inspect, so these specs are meaningless (and skipped) outside the demo profile.
- **Token is never assumed.** The reset token is always read from the email that the API actually sent, which is what makes the test meaningful.
- **Enumeration-safe response.** The acknowledgement text ("If the account exists…") is deliberately identical whether or not the account exists; the test asserts exactly that wording.
- **Two password fields** on the confirm page are addressed with `.eq(0)` (new) and `.eq(1)` (confirm).
- **Demo user / password:** `gino@pino.it` / `password` (the "old" password that must stop working).
