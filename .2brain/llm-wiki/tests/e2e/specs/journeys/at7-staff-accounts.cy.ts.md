---
source: tests/e2e/specs/journeys/at7-staff-accounts.cy.ts
sha256: 89bfb5c0955817a7f02a9aafa1f80947c46c599505fc3c95e34b50269116aaaf
signature: b78bf3a64740acbf90843de1a7baf5b76c5c0400c90c620304ced8e301e46e39
generated_at: 2026-11-10T06:52:45.241351+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at7-staff-accounts.cy.ts

## Purpose

Cypress e2e journey test covering the full staff-account lifecycle: an admin creates a warehouse-role account in Italian (no password field), the recipient follows a localized setup-mail link to set their password, and the new staff member sees only their warehouse-scoped menu. A second test verifies that phone/website/avatar edits persist and that a concurrent-save (stale-record) conflict is detected and resolved.

## Key elements

- **`STAFF`** – constant holding the new staff member's email, username, and the password set via the mailed link.
- **`ITALIAN_SETUP_SUBJECT`** – expected Italian subject line of the setup-request email.
- **`EDITED`** – phone and website values the admin types into the edit form in the second test.
- **`describe('AT7 · Staff accounts')`** – the test suite; `beforeEach` resets via `cy.visit('/en') → cy.restore() → cy.visit('/en')`.
- **Test 1** – *"a created staff member is mailed a setup link in their language, and sees their own menu"*: creates the account through the UI form, asserts no password field exists, verifies the mail template/subject, follows the link, sets the password, ticks the terms checkbox, signs in, confirms the staff-enrollment banner, enrolls an authenticator app, then asserts the menu contains `/inventory` but not `/users`, `/locales`, or `/audit`.
- **Test 2** – *"phone, website and avatar survive a reload, and a stale save is refused until reloaded"*: looks up an existing `editor` user by email, edits phone/website/avatar, verifies persistence on reload, simulates a concurrent `PATCH` to trigger the stale-record guard, clicks the reload-latest button, and confirms the next save succeeds.

## Relationships

- **`tests/support/e2e/commands.ts`** – provides `mailedLinkUrl(email)` (extracts the URL from a mail body) and `expectMailTemplate(email, name)` (asserts the correct template was used).
- **`tests/support/e2e/security-steps.ts`** – provides `enrolAuthenticatorApp()`, which drives the TOTP enrollment flow in the UI.
- **`tests/support/e2e/steps.ts`** – provides `signInWith(email, password)` (form-based login) and `adminMenuLinks()` (returns the array of menu hrefs for the currently signed-in user).

## Notes

- The top-of-file `requires-module: account, inventory, users` comment indicates which feature modules must be present for this test to pass.
- Test 1 calls `cy.skipUnlessMailbox()` and will skip entirely if no SMTP/mail-catcher is available.
- The staff account is **not** seeded; it is created through the UI form in the test, so `cy.loginAs` is never used for it. The admin, by contrast, uses `cy.loginAs('admin')`.
- Menu-link assertions check URL **suffixes** (`href.endsWith(page)`) rather than text, because the UI is rendered in Italian after the locale switch.
- The authenticator-app step is mandatory: the staff role grants no menu items until the app is armed (banner `data-test=staff-enrollment-banner` is present before enrollment).
- The stale-record test relies on the `editor` account existing in the fixture/seed data; it is looked up by email via `cy.accountOf` + `cy.apiAs` search.
