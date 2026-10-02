---
source: src/modules/account/tests/e2e/two-factor.cy.ts
sha256: a7ceccf657d2ecbf4a37dc2096d48ac35422a633a94eae3e0b2a64067647b5fd
generated_at: 2026-10-02T14:50:06.104399+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/two-factor.cy.ts

## Purpose

Cypress end-to-end spec that exercises the full email-based two-factor authentication lifecycle: enrolling email as a second factor, verifying the challenge page on the next login, accepting a code read from the mailbox, rejecting an incorrect code, regenerating backup codes, and removing the last factor to disable 2FA. It exists because the 2FA flow spans multiple pages, a backend mail template, and mailbox polling, none of which unit tests can cover together.

## Key elements

- **`describe('Two-factor authentication')`** – top-level suite; `beforeEach` visits `/en`, calls `cy.restore()` to reset state, then re-visits `/en`.
- **Test 1 – "enrolls email, challenges the next login, and accepts the mailed code"** – the happy-path: enroll via `cy.enrollEmailTwoFactor`, log out, log back in to hit `#two-factor-challenge-page`, click send, read the code with `cy.emailTo`, type it, submit, and confirm a real session (home + profile pages).
- **Test 2 – "a wrong code is refused…"** – types a hard-coded `000000` into the challenge form and asserts the user stays on `/login/2fa` with no redirect.
- **Test 3 – "regenerating backup codes discards the old set…"** – enrolls manually (not via the shared command) to capture a backup code, regenerates the set, verifies the new first code differs, and confirms the old code is rejected at the challenge page via `loginToChallenge` / `submitBackupCode`.
- **Test 4 – "removing the last factor turns 2FA off…"** – enrolls manually to keep a backup code, removes the only armed factor using that code, then verifies the next login goes straight through with no challenge page.
- **`cy.skipUnlessMailbox()`** – guards every test; skips only a live run where no Mailpit instance is available.

## Relationships

- **`tests/support/e2e/scenario.ts`** – supplies `seedAccount('user')` for the email and password used throughout every test.
- **`tests/support/e2e/commands.ts`** – supplies `expectMailTemplate` (template assertion in test 1) and the custom commands `cy.loginAs`, `cy.enrollEmailTwoFactor`, `cy.typeMailedTwoFactorCode`, `cy.emailTo`, `cy.skipUnlessMailbox`, `cy.restore`.
- **`tests/support/e2e/security-steps.ts`** – supplies `loginToChallenge` and `submitBackupCode`, used in test 3 to drive the challenge page with a backup code and assert rejection.

## Notes

- Tests 3 and 4 deliberately bypass `cy.enrollEmailTwoFactor()` and drive the enrollment dialog by hand because the shared command dismisses the backup-codes screen without exposing the codes; those tests need one code captured before the screen closes.
- `expectMailTemplate` appears only in test 1. The in-file comment explains this is intentional: it pins the *login-challenge* mail to the correct backend template and does not need to repeat for every code-read path.
- Test 2 uses a literal `000000` string rather than reading from the mailbox, so it is the only test that never actually receives a mail.
- The `beforeEach` double-visit pattern (`visit → restore → visit`) is the project's state-reset idiom; the first visit ensures the app is loaded, `cy.restore()` wipes seeded state, and the second visit re-bootstraps.
