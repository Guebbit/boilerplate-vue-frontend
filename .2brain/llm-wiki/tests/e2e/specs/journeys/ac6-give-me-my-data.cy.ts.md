---
source: tests/e2e/specs/journeys/ac6-give-me-my-data.cy.ts
sha256: ad14f36c17b21486adc1b1c73adeaa723db67f7b474e1380bdb036d15a4fec37
signature: 022a7bf373f7901463c228fd9e23c836c6945c1fd7ee5e90d1aa0571dd2349cb
generated_at: 2026-11-10T06:49:10.799101+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac6-give-me-my-data.cy.ts

## Purpose

Cypress e2e journey test for Acceptance Criterion 6 ("Give me my data"). It verifies the full GDPR export flow: a customer requests an export from their profile, receives a download link by email, downloads a JSON file, and confirms that file contains their own profile, addresses, orders, sessions, and sign-in methods while excluding secrets and other users' data. A second test (demo-backend only) verifies that an export link expires after roughly a week and that re-requesting produces a fresh, downloadable export.

## Key elements

- **`exportLinkOf(mail: MailedEmail): string`** — Extracts the `/account-export` download URL from a mailed email. Tries the `links` array first (demo outbox), then falls back to `mailedLinkUrl` (live inbox `linkUrl:` line).
- **`ExportData` (interface)** — Declares the expected JSON shape of the export file: `exportedAt`, `profile`, `sessions`, `addresses`, `signInMethods`, `orders`.
- **`keysOf(value: unknown): string[]`** — Recursively collects every key name at any depth in a parsed JSON value, used for the secret-key scan.
- **`SECRET_KEY` / `SIGNED_TOKEN` (regexes)** — Patterns matching secret-looking key names (`password`, `token`, `secret`, `hash`) and JWT-shaped tokens (`eyJ…`), asserted absent from the export.
- **`HOUR_MS`, `DAY_MS`** — Time constants for the expiry test's `cy.travel()` call.
- **`describe('AC6 · Give me my data')`** — Two `it` blocks: the full export-and-verify journey, and the link-expiry/re-request journey (demo-only).

## Relationships

- **`tests/support/e2e/commands.ts`** — Provides `expectMailTemplate` and `mailedLinkUrl` (imported directly), plus the custom Cypress commands used throughout the test (`cy.loginAs`, `cy.accountOf`, `cy.emailTo`, `cy.subjectId`, `cy.travel`, `cy.runJob`, `cy.skipUnlessMailbox`, `cy.skipUnlessDemo`, `cy.restore`, `cy.step`).
- **`scripts/e2e/mail-message.ts`** — Provides the `MailedEmail` type that `exportLinkOf` consumes.
- **`tests/cross-cutting/module-map.spec.ts`** — Consumes the `// requires-module: account, orders` annotation at the top of this file to verify the journey is registered under the correct modules.

## Notes

- The test asserts the downloaded file **on disk** (via `cy.readFile` in `Cypress.config('downloadsFolder')`) matches the intercepted API response, so the proof covers what the user actually saves, not just the network payload.
- `exportLinkOf` handles two outbox formats: the demo backend records the link in a `links` array, while a live mail sink exposes it only as a `linkUrl:` line read by `mailedLinkUrl`. This is why the function tries both.
- The second test is gated on **both** `cy.skipUnlessDemo()` and `cy.skipUnlessMailbox()` — the time-travel (`cy.travel`) and job-runner (`cy.runJob`) capabilities are demo-backend only.
- The secret scan checks key *names* recursively AND the serialised JSON string for JWT-shaped tokens; it does not inspect value contents beyond that.
- `cy.step(...)` calls are cosmetic (step names in the report) and carry no logic.
