---
source: tests/e2e/specs/journeys/ac24-someone-is-guessing-my-codes.cy.ts
sha256: 28c39d4855a1687f68d202cede53cf6bbc5acabfeb94e455c5aa2024c973083a
signature: b59c555a47d2dd7b381da10a54478b1e582bcec5e7c8b9f73f377c56fface572
generated_at: 2026-11-10T06:47:47.609979+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac24-someone-is-guessing-my-codes.cy.ts

## Purpose

E2E journey test for AC24: verifies that an account tolerates 5 wrong 2FA guesses per challenge and 10 across challenges, that the 10th wrong guess triggers a 15-minute lock with an owner notification email, that a correct code is refused during the lock (and not consumed), and that only a password reset lifts the lock. Runs against the seeded `twoFactor` persona.

## Key elements

- **`GUESSES_ALLOWED` (5)** — mirrors `NODE_MFA_CHALLENGE_MAX`; the per-challenge wrong-guess cap.
- **`RESET`** — the password the test sets during the reset step.
- **`LOCKED_SUBJECT`** — substring expected in the lock-notification email subject.
- **`watchGuesses()`** — registers a single `cy.intercept` alias `@guess` on `POST **/account/login/2fa`; called once before the first submission (see AC16 note).
- **`guessWrong(expectedStatus)`** — types `000000` into the open challenge, submits, and asserts the intercept alias returned the given HTTP status.
- **`describe › it` (single test)** — walks the full lock cycle: 5 × 422, 1 × 429 (challenge exhausted), 5 more × 422 on a fresh challenge (account exhausted), lock mail assertion, backup-code refusal (429, not consumed), password reset, then successful sign-in with the same backup code.

## Relationships

- **`tests/support/e2e/security-steps.ts`** — provides the high-level step functions used throughout: `loginToChallenge`, `requestReset`, `submitBackupCode`, `submitLoginForm`, `submitReset`.
- **`tests/support/e2e/commands.ts`** — provides `byTemplate` (template-matching mail filter) and `mailedLinkUrl` (extracts the click-through URL from a received email).

## Notes

- **Mailbox required:** the test calls `cy.skipUnlessMailbox()` and will be skipped in environments without a live inbox.
- **Backup code as the "right code":** deliberately chosen because spending it does not require a mailbox read, whereas the lock mail *does*. This avoids a dependency on reading the lock email before the refusal assertion.
- **15-minute expiry is not exercised here:** pinned by a backend integration test; walking real time in E2E is out of scope.
- **`watchGuesses` is set up once, not per guess:** a per-guess re-intercept would race with the previous request (documented in AC16).
- **`beforeEach` uses `cy.restore()`:** relies on the seeded persona snapshot for deterministic state; re-visits `/en` after restore to ensure a clean SPA boot.
