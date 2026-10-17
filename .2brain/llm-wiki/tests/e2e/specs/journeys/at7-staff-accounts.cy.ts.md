---
source: tests/e2e/specs/journeys/at7-staff-accounts.cy.ts
sha256: e5d468aa904397b353c51125f25153806149bb41e9a3140fb903fdf3680195fa
generated_at: 2026-10-17T02:08:37.205561+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/at7-staff-accounts.cy.ts

## Purpose

Cypress E2E journey covering the AT7 "Staff accounts" acceptance test. It verifies two full user stories: (1) an admin creates a warehouse-role account with a locale, the new member receives a setup mail in that language, sets a password via the mailed link, and sees only the warehouse-scoped menu; (2) the admin edits an existing user's phone, website, and avatar, confirms persistence across reload, and exercises the stale-record guard when another save lands first.

## Key elements

- **`STAFF`** – object holding the new member's email, username, and the password that the mailed link sets.
- **`ITALIAN_SETUP_SUBJECT`** – expected Italian subject line of the setup-request mail.
- **`EDITED`** – phone and website values the admin types into the edit form.
- **`adminMenuLinks()`** – opens the admin menu, collects every `<a>` href, closes the menu with `{esc}`, and returns a `Cypress.Chainable<string[]>`.
- **Test 1: "a created staff member is mailed a setup link…"** – creates the account via the form (asserts no password field exists), picks `warehouse` role and `italian` locale, checks the mail template/subject, follows the link to set a password, signs in as the new member, and asserts menu links point to `/inventory` but not `/users`, `/locales`, or `/audit`.
- **Test 2: "phone, website and avatar survive a reload…"** – looks up the `editor` user by email via API, edits three fields in the UI, verifies they persist after reload, triggers a stale save via `cy.apiAs` PATCH, asserts the stale-save guard appears, clicks reload, and confirms the next save succeeds.

## Relationships

- **`tests/support/e2e/commands.ts`** – provides `mailedLinkUrl` (extracts the actionable URL from a mail object) and `expectMailTemplate` (asserts a mail matches a given template key). Also the likely home for the `cy.emailTo`, `cy.apiAs`, `cy.pickOption`, `cy.skipUnlessMailbox`, and `cy.restore` custom commands used throughout.
- **`tests/support/e2e/steps.ts`** – provides `signInWith`, used to log in as the freshly-created staff member after the password-reset flow.

## Notes

- The file header lists `requires-module: account, inventory, users`, meaning the backend must have those modules enabled for the tests to pass.
- `cy.restore()` in `beforeEach` resets DB state; the second test re-visits `/en` after restore to re-establish session.
- `cy.skipUnlessMailbox()` guards the first test: it is skipped when no Mailpit/mail-capture service is running.
- The admin is used (not a moderator) because the admin holds every warehouse key; a moderator would be refused most roles (referenced as JB12).
- `adminMenuLinks` reads `href` attributes rather than visible text because the new member's locale is Italian, so link labels differ from the English `/en/...` prefixes.
- The second test uses `cy.apiAs` (a raw API call as the admin) to simulate a concurrent edit, rather than a second browser session.
