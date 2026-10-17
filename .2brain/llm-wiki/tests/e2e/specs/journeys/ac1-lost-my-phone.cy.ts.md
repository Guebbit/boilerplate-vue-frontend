---
source: tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts
sha256: b1c44d1d1e4ee6ee1d85973270c81dc04b1122d609c8a87a0c310aa88c63ea4e
generated_at: 2026-10-17T02:04:01.982327+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac1-lost-my-phone.cy.ts

## Purpose

Cypress end-to-end journey test for acceptance criterion AC1 ("I lost my phone"). Verifies the full backup-code sign-in flow: a code is single-use, a second attempt with the same code is rejected, a different code still works, and regenerating the code set invalidates every old code (used or unused) while a new code signs in successfully.

## Key elements

- **`Persona` interface** — local shape of the object returned by `cy.accountOf('twoFactor')` (`email`, `password`, `backupCodes?`).
- **`codesOf(account)`** — asserts the persona carries ≥ 4 backup codes and returns the array; used to destructure `first`–`fourth` in the test.
- **`describe('AC1 · I lost my phone: backup codes')`** — single suite with one `it` that walks the entire journey in sequence (password-only rejection → first code succeeds → reuse rejected → second code succeeds → regeneration → fourth code dead → fresh code succeeds).
- **`beforeEach`** — visits `/en` and calls `cy.restore()` to reset database state between runs.

## Relationships

- **`tests/support/e2e/security-steps.ts`** — imports four shared step helpers used throughout the journey:
  - `loginToChallenge(account)` — performs the password login and arrives at the 2FA challenge page.
  - `submitBackupCode(code)` — types and submits a backup code on the challenge form.
  - `revealedBackupCodes()` — reads the newly revealed codes after regeneration.
  - `dismissBackupCodes()` — closes the code-display dialog after the codes have been captured.

## Notes

- Header comment declares `requires-module: account`; the test depends on that module's seeded data (the `twoFactor` persona with five pre-generated backup codes).
- The test needs **at least 4** of the 5 seeded codes; `codesOf` enforces this with an explicit `expect`.
- `cy.step(...)` calls are narrative markers only (no assertion logic) — they exist to make failure output readable as a story.
- The doc comment states the journey "runs on both profiles"; the file itself contains no profile-switching logic, so this is presumably handled by the test runner or a parent config.
- No mail is read during the test — the seeded persona already has 2FA armed, so the flow is self-contained.
