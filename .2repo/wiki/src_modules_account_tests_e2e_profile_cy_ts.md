# src/modules/account/tests/e2e/profile.cy.ts

## Purpose

Cypress E2E spec covering the profile self-service surface: language preference, role visibility, password change, session list/revocation, address book (add / promote-default / remove-default), and email verification. Tests run against the real API in its demo profile so backend invariants (one default address, a `current` session flag, unverify-on-email-change) are exercised as the page honours them.

## Key elements

- **`fillAddress(label, street)`** – helper that fills the six required inputs in the address dialog via positional index and clicks save.
- **`loginFromAnotherDevice()`** – helper that calls `cy.task('createSession', …)` with the `E2E_ACCOUNTS.user` credentials to create a second server-side session without disturbing the in-page refresh cookie.
- **`describe('Profile access')`** – two guest-facing tests: redirect-to-login with `continue=` param, and rejection of an unissued verification token (422 stays on page).
- **`describe('Profile self-service')`** – the main authenticated suite (precondition: `cy.loginAs('user')`, navigate to `/en/profile`):
  - **language preference** – switching to Italian updates the runtime locale *and* the `:locale` route segment; survives a full logout/login cycle.
  - **role** – select is absent for a standard user; visible to admin, submit stays disabled until the value changes, self-demotion triggers a confirm dialog (test cancels it to preserve the demo admin for other specs).
  - **password change** – happy path uses the real seeded password; wrong-password path expects a 422 toast ("Unprocessable Entity") and the session surviving.
  - **sessions** – after `loginFromAnotherDevice`, the list shows two items with exactly one flagged `session-current`; revoking the other leaves one.
  - **address book** – seeded one default; adding a second keeps exactly one default; promoting moves the flag; removing the default auto-promotes the survivor.
  - **email verification** – no banner for verified seed; changing email un-verifies and surfaces the banner (test is truncated in the snapshot above).

## Relationships

- **`tests/support/e2e/accounts.ts`** – imports `E2E_ACCOUNTS` for the demo user's email/password (used by `loginFromAnotherDevice`, the password-change spec, and the email-verification spec).
- **`cypress.config.ts`** (referenced in a comment) – registers the `createSession` task that `loginFromAnotherDevice` calls via `cy.task`.
- **`registration.cy.ts`** (referenced in a comment) – owns the happy-path guest email-verification test; this file only covers the negative/guest-token case.

## Notes

- Element targeting is by `data-test` attributes exclusively; no CSS class or text selectors for assertions on structure.
- The `.should('not.be.disabled').clear().type(…)` three-part pattern appears on every input interaction; it guards against acting before Vue hydration finishes.
- The role spec **deliberately cancels** the self-demotion confirmation so the demo admin retains its role for every other spec in the run.
- The password-change happy path **actually mutates** the seeded password to `BrandNew_Secret1!`; the wrong-password spec then expects the original (now-changed) password to fail, relying on execution order within the file.
- `fillAddress` types by positional index (`input` `.eq(n)`), so adding or reordering a field in the dialog will silently shift values.
- The file's module doc-block makes explicit the boundary: these specs pin that the *page* honours backend invariants; the invariants themselves are tested in backend unit/integration suites.
