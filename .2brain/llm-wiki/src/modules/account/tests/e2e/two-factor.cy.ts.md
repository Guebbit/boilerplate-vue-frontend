---
source: src/modules/account/tests/e2e/two-factor.cy.ts
sha256: a7ceccf657d2ecbf4a37dc2096d48ac35422a633a94eae3e0b2a64067647b5fd
signature: a7ceccf657d2ecbf4a37dc2096d48ac35422a633a94eae3e0b2a64067647b5fd
generated_at: 2026-11-10T03:34:32.761370+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/two-factor.cy.ts

## Purpose
Cypress e2e suite covering the full email-2FA lifecycle: enroll email as a second factor, verify the login challenge flow (correct and wrong codes), regenerate backup codes, and remove the factor so a subsequent login bypasses 2FA entirely. Every test is gated behind `cy.skipUnlessMailbox()` because it depends on reading the one-time code from a Mailpit (or demo) outbox.

## Key elements
- **`describe('Two-factor authentication')`** — top-level suite; `beforeEach` runs `cy.visit → cy.restore → cy.visit` to reset state between cases.
- **Test 1: enroll → challenge → accept mailed code** — the happy path; also the only place `expectMailTemplate` is called, intentionally pinning the login-challenge email to the correct backend template without repeating that assertion in other tests.
- **Test 2: wrong code refused** — types `000000`, asserts the user remains on `#two-factor-challenge-page` and the URL still contains `/login/2fa`.
- **Test 3: regenerate backup codes** — enrolls by hand (bypassing `cy.enrollEmailTwoFactor`) to capture the first backup code, regenerates the set, proves the new first code differs, and confirms the old code is now rejected via `submitBackupCode`.
- **Test 4: remove last factor** — also enrolls by hand to grab a backup code, removes the email factor using that code, then verifies the next login skips the challenge entirely.

## Relationships
- **`tests/support/e2e/scenario.ts`** — `seedAccount('user')` supplies the email/password used throughout.
- **`tests/support/e2e/commands.ts`** — `expectMailTemplate(email, templateName)` asserts the challenge email used the expected backend template (called once in test 1).
- **`tests/support/e2e/security-steps.ts`** — `loginToChallenge(account)` and `submitBackupCode(code)` drive the backup-code verification flow in test 3.

## Notes
- Tests 3 and 4 deliberately skip the shared `cy.enrollEmailTwoFactor()` command because it dismisses the backup-code screen without exposing the codes; they perform enrollment step-by-step to read a code first.
- `cy.emailTo` is an alias that reads the demo outbox in dev or the Mailpit inbox in CI; `cy.skipUnlessMailbox()` returns early only when a live run has no Mailpit available, so local dev runs always execute.
- The template assertion is intentionally scoped to a single test to avoid coupling every code-reading step to a specific template name.
