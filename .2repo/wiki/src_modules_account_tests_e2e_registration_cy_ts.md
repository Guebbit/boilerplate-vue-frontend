# src/modules/account/tests/e2e/registration.cy.ts

## Purpose

End-to-end Cypress suite covering the full registration arc: account creation, consuming the emailed verification token as a guest, and confirming the password gate actually enforces the chosen password. It also verifies the "email unverified" banner appears and disappears around token consumption. The tests deliberately cross page reloads (fresh `cy.visit`) to mirror how a real user follows the inbox link, ensuring the account genuinely persists server-side.

## Key elements

- **`describe('Registration')`** — top-level block; `beforeEach` resets state (`cy.resetState()`) and re-visits `/en` for a clean session.
- **Test 1: "a visitor signs up, spends the emailed token as a guest, and logs in verified"** — Signs up via the form, reads the verification token from `cy.demoEmailTo('new.customer@example.com')`, opens `/en/verify-email/confirm?token=…` as a guest, submits, then confirms the password gate by being rejected with a wrong password and accepted with the right one. Finally asserts no `[data-test=verify-banner]` on `/en/profile`.
- **Test 2: "an unverified account shows the banner until the emailed token is spent"** — Signs up, logs in *without* verifying (banner present on `/en/profile`), then consumes the token via the demo email endpoint and confirms the banner is gone.
- **`cy.demoEmailTo(address)`** — Reads a specific email from the demo backend's `/__demo/emails` endpoint; returns `{ template, token, … }`.
- **`cy.skipUnlessDemo()`** — Skips the test when not running against the demo backend.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- Every test is gated behind `cy.skipUnlessDemo()`; the suite is a no-op in non-demo environments.
- `cy.resetState()` in `beforeEach` is required because the first test leaves a verified account behind.
- The two password inputs on the signup form are disambiguated with `.eq(0)` / `.eq(1)` (confirm field is the second one).
- Each `.type()` / `.clear()` is preceded by `.should('not.be.disabled')` — a defensive assertion that the input is interactive before typing.
- The verification link is intentionally opened with a bare `cy.visit(...)` (no prior auth), so the token is the only credential; this catches regressions where the app assumes a session is already present.
