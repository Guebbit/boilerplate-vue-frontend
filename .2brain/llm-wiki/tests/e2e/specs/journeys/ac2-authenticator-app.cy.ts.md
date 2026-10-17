---
source: tests/e2e/specs/journeys/ac2-authenticator-app.cy.ts
sha256: d208d042140c312accef18024cb07ec57346ba40a1ee434d0ab041b33c58d327
generated_at: 2026-10-17T02:05:51.991610+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac2-authenticator-app.cy.ts

## Purpose

Cypress E2E journey test for AC2 (TOTP authenticator app). It walks a single user through the complete lifecycle — enrol from a visible secret, sign in with a generated code, replace the authenticator via a backup code (lost-phone flow), and finally disable 2FA — verifying that each step produces the expected UI state.

## Key elements

- **`ONE_STEP_MS`** (31 000 ms) — constant just over one TOTP period, used for the single real-time `cy.wait` before the disable-2FA code is submitted.
- **`SECRET_PATTERN`** (`/[2-7A-Z]{16,}/`) — regex that extracts the base32 secret from the enrolment dialog's manual-entry sentence.
- **`secretOnScreen()`** — locates `[data-test=two-factor-enroll-secret]`, applies `SECRET_PATTERN`, and asserts a string match; returns the secret as a chainable.
- **`confirmEnrolment(code)`** — types a six-digit code into the enrolment input and clicks the confirm button.
- **`signInWithCode(account, code)`** — delegates to `loginToChallenge`, then types and submits a code on the challenge page.
- **`describe('AC2 · An authenticator app')`** — single test that chains the full journey using `cy.step` narration; each TOTP code is minted at a distinct step offset (0, 1, 2) to satisfy the backend's one-use-per-step rule.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `totpCodeFor(secret, stepOffset)`, which computes the 6-digit TOTP code in Cypress' Node process using the same `otplib` the backend verifies with.
- **`tests/support/e2e/security-steps.ts`** — provides `loginToChallenge`, `submitLoginForm`, `revealedBackupCodes`, and `dismissBackupCodes` used throughout the journey for navigation and backup-code interaction.

## Notes

- **Code-freshness strategy:** the backend accepts each TOTP step at most once (±1 step drift). The test avoids `cy.wait` everywhere except once (before disabling 2FA) by minting each successive code at a higher step offset instead. The single 31 s wait is the one place a code *must* be genuinely newer than the last accepted one.
- **State isolation:** `beforeEach` calls `cy.visit('/en')` then `cy.restore()`, relying on the test harness's save/restore mechanism rather than re-seeding.
- **No mailbox needed:** the flow uses only the on-screen secret and backup codes; no email/SMS OTP is involved.
- **`requires-module: account`** pragma at the top signals the test depends on the `account` support module (used via `cy.accountOf` / `cy.loginAs`).
