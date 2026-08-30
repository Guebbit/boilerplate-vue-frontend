# src/modules/account/tests/e2e/registration.cy.ts

## Purpose

Cypress end-to-end spec covering the full registration arc: a visitor signs up, spends the emailed verification token as a guest (via a fresh page load), and then proves the password gate is real by having the wrong password refused before the correct one is accepted. A second test confirms the unverified-banner lifecycle (present until the token is spent, absent after).

## Key elements

- **`describe('Registration')`** — top-level suite; `beforeEach` visits `/en`, calls `cy.resetState()`, then visits `/en` again to start from a clean slate.
- **Test: "a visitor signs up, spends the emailed token as a guest, and logs in verified"** — Full happy path. Fills the signup form, asserts redirect to `#login-page` (no auto-login), reads the verification email via `cy.demoEmailTo`, opens the confirm link as a guest (`cy.visit`), submits verification, then logs in with a wrong password (stays on `/login`) followed by the correct one (leaves `/login`). Final visit to `/en/profile` asserts no verify banner.
- **Test: "an unverified account shows the banner until the emailed token is spent"** — Signs up, logs in *without* verifying, asserts `[data-test=verify-banner]` exists on `/en/profile`. Then spends the emailed token and asserts the banner is gone.
- **`cy.skipUnlessDemo()`** — guards both tests so they only run against the demo backend.
- **`cy.demoEmailTo(address)`** — custom command that fetches the demo backend's `/__demo/emails` endpoint and returns the email object (template, token).
- **`cy.resetState()`** — custom command that wipes server-side test state between runs.

## Relationships

No dependency-graph neighbors are recorded for this file. It exercises the application purely through the browser and the demo backend's HTTP surface (`/__demo/emails`, page routes), with no direct imports of application source.

## Notes

- Page transitions between phases use `cy.visit(...)` deliberately, simulating a real user opening a new tab/link. Nothing in the browser carries the new user across; the account must exist server-side.
- The wrong-password attempt is intentional (not a separate test) to prove the auth check is enforced, not just a UI flourish.
- Both tests are demo-gated; running them against a production or CI backend will skip silently.
- Selectors mix attribute (`[type=email]`, `[type=password]`), ID (`#signup-page`, `#login-page`, `#home-page`, `#profile-page`), and `data-test` hooks (`[data-test=verify-submit]`, `[data-test=verify-banner]`). The `data-test` attributes are the stable contract for verification UI.
