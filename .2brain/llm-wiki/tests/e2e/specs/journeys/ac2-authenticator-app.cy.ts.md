---
source: tests/e2e/specs/journeys/ac2-authenticator-app.cy.ts
sha256: 56f3c21a9baaf58a43d30db767426326f48b932e9d7b3f845dd28512eba790e7
signature: 9a93591b26409e61866b8aa7a5fa4cacc81bf4743185cd8d93781594325d06f3
generated_at: 2026-11-10T06:46:39.923892+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac2-authenticator-app.cy.ts

## Purpose

End-to-end journey test for the TOTP authenticator app (AC2). Verifies the full lifecycle in a single test: enrol from a secret, reject a wrong code / accept a right one, sign in with a generated code, replace the authenticator via a backup code (lost-phone path), confirm the old secret no longer works, disable 2FA with a code from the new secret, and confirm login no longer prompts for a code.

## Key elements

- **`ONE_STEP_MS`** (31 000 ms) — the single real-time wait used to guarantee the final TOTP code is in a newer step than the one just consumed.
- **`signInWithCode(account, code)`** — helper that navigates to the challenge page, types a code into the `two-factor-challenge-code` input, and submits.
- **`describe('AC2 · An authenticator app')`** — the test suite. One `it` block containing the entire journey; `beforeEach` visits `/en` and restores fixtures.
- **TOTP code generation** — every code is computed in-process via `totpCodeFor(secret, step)`, mimicking what a real authenticator app would display. The step argument increments as the journey progresses because the backend accepts each step exactly once (± 1 drift).

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDevice` (creates a second-device login for cross-device assertions), `refreshDevice` (re-fetches a device to verify its status, as in the 401 check after arming), and `totpCodeFor` (computes a TOTP code for a given secret and step using the same `otplib` the backend uses).
- **`tests/support/e2e/security-steps.ts`** — provides the reusable page-interaction steps: `loginToChallenge`, `confirmEnrolment`, `dismissBackupCodes`, `revealedBackupCodes`, `secretOnScreen`, and `submitLoginForm`. The test composes these rather than duplicating selector logic.

## Notes

- The `// requires-module: account` comment at the top gates this spec; it will not run unless the `account` feature flag/module is enabled.
- The only `cy.wait` in the file (31 s) is the **sole real-time dependency** — it exists because TOTP is time-based and the backend will not accept the same step twice. An `eslint-disable` comment suppresses `cypress/no-unnecessary-waiting` for that line.
- TOTP codes are minted one step *ahead* of the previously used code to stay within the backend's ± 1 drift window without needing a real wait between most steps.
- The test asserts the other device is revoked (401 on refresh) after arming, confirming the "session rotation" side-effect.
- Runs on both site profiles; requires no mailbox (unlike SMS/OTP journeys).
