---
source: tests/e2e/specs/journeys/ac6-give-me-my-data.cy.ts
sha256: 1b330d6a523f494b4f9272ec58f92ad2fff824fef13c379608968d1cae9603c0
generated_at: 2026-10-17T02:06:48.140079+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac6-give-me-my-data.cy.ts

## Purpose

E2E test for AC6 (GDPR data portability). Verifies that a customer who requests an account export from the profile page receives an emailed link, downloads a JSON file, and that the file contains only their own data (profile, addresses, orders, sign-in methods) while excluding all secrets and other users' information.

## Key elements

- **`exportLinkOf(mail)`** — Extracts the download URL from a `MailedEmail`, searching `mail.links` for a `/account-export/` path first, falling back to `mailedLinkUrl(mail)`.
- **`ExportData`** — Interface describing the export document: `exportedAt`, `profile`, `addresses`, `signInMethods` (with `providers` and `twoFactor`), `orders`.
- **`keysOf(value)`** — Recursively collects every key name in a JSON value at any depth (handles arrays and nested objects).
- **`SECRET_KEY`** — Regex (`/password|token|secret|hash/i`) asserting no key matching these terms appears in the export.
- **`SIGNED_TOKEN`** — Regex matching JWT-shaped tokens (`eyJ` + two base64url segments) anywhere in the serialized export.
- **`describe('AC6 · Give me my data')`** — Single test that: requests export (expects 202), retrieves the mailed link, clicks the download button, reads the saved `.json` file from disk and deep-equals it against the API response, then asserts ownership (correct email, order IDs, sign-in methods), absence of secrets, and absence of other users' data.

## Relationships

- **`tests/support/e2e/commands.ts`** — Imports `expectMailTemplate` (validates the mail template identifier) and `mailedLinkUrl` (fallback link extraction from the mail body). Also provides the custom commands `cy.loginAs`, `cy.accountOf`, `cy.subjectId`, `cy.skipUnlessMailbox`, `cy.emailTo`, and `cy.step` used throughout the test.
- **`scripts/e2e/mail-message.ts`** — Imports the `MailedEmail` type, which defines the shape of `mail.links` and other fields that `exportLinkOf` reads.

## Notes

- Header comment `// requires-module: account, orders` indicates this test depends on those feature modules being active.
- The test is gated by `cy.skipUnlessMailbox()`; it will be skipped in environments without a mail outbox.
- `beforeEach` restores a clean state via `cy.restore()` between visits.
- The link extraction logic differs between environments: a live mail sink exposes links only via the body (hence `mail.links` may be absent), while the demo outbox records them in a `linkUrl:` line read by `mailedLinkUrl`.
- The download file is read from `Cypress.config('downloadsFolder')` and must `deep.equal` the API response body, ensuring the saved artifact matches what the server sent.
- The order-ownership check uses `cy.subjectId('order.paid')` and `cy.subjectId('order.otherPending')` to confirm the export includes the customer's paid order but excludes another shopper's pending order.
