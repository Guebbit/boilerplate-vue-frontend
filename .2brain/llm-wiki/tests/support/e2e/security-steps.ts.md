---
source: tests/support/e2e/security-steps.ts
sha256: 16165a6218142487f233aa28790a6b68eac511f5146a61ce87a06984a0f5ae6e
signature: 743be0904dfb4722ae9969113f6ed0b398ea85537be5ff1677343a339db1e3cc
generated_at: 2026-11-10T07:35:23.374365+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/security-steps.ts

## Purpose

Shared Cypress step functions for account-security E2E journeys (2FA, backup codes, password reset, authenticator enrolment). Acts as a step library in the same style as `steps.ts` — plain `cy`-based functions with no internal state — so multiple journey specs exercise the same flows identically.

## Key elements

- **`submitLoginForm(email, password)`** — Types credentials into `/en/login` and submits. Deliberately asserts nothing about the outcome; the caller decides whether a session, 2FA challenge, or error is expected.
- **`loginToChallenge(account)`** — Calls `submitLoginForm`, then asserts the `#two-factor-challenge-page` is present.
- **`submitBackupCode(code)`** — On the challenge page, switches to the backup-code field and submits a single-use code.
- **`revealedBackupCodes()`** — Reads all `<li>` items from the one-time reveal list, returns `Cypress.Chainable<string[]>`.
- **`dismissBackupCodes()`** — Clicks "confirm saved" + "continue" on the reveal screen; asserts the codes panel is gone.
- **`loginDeviceWith(email, password)`** — Signs in a *second* device whose password the seed doesn't know (mid-journey change). Returns `Cypress.Chainable<Device>`.
- **`letTimePass(ms)`** — Advances time: `cy.travel(ms)` in demo, `cy.wait(ms)` in live (checked via `liveProfile` env).
- **`requestReset(address)`** — Submits the forgot-password form and asserts the enumeration-safe acknowledgement text.
- **`submitReset(password)`** — Fills both password fields on the reset-confirm page and submits.
- **`secretOnScreen()`** — Extracts the base32 TOTP secret from the open enrolment dialog using `SECRET_PATTERN` (`[2-7A-Z]{16,}`).
- **`confirmEnrolment(code)`** — Types a 6-digit TOTP code and clicks confirm in the enrolment dialog.
- **`enrolAuthenticatorApp()`** — Compound step: visits `/en/profile`, opens TOTP enrolment, reads the secret, generates a code via `totpCodeFor`, confirms, dismisses backup codes, asserts armed. Returns the base32 secret for later sign-ins.
- **`ACKNOWLEDGEMENT`** (private) — The exact enumeration-safe string the reset endpoint returns regardless of account existence.
- **`SECRET_PATTERN`** (private) — Regex matching a valid base32 secret.

## Relationships

- **Journey specs** (`ac1-lost-my-phone`, `ac13-my-password-start-to-finish`, `ac16-two-factor-awkward-edges`, `ac17-copied-session-cookie`, `ac2-authenticator-app`, `ac21-it-was-not-me`, `ac22-i-disconnected-the-provider`, `ac24-someone-is-guessing-my-codes`, `ac25-what-i-agreed-to`, `at7-staff-accounts`, `cu16-a-whole-purchase-in-italian`, `in2-a-key-follows-its-minter`, `op19-only-a-role-manager-hands-out-roles`) — Import and call the exported step functions to drive their scenarios.
- **`src/modules/account/tests/e2e/two-factor.cy.ts`** — Also consumes these steps for 2FA-focused tests.
- **`./harness`** (import) — Provides `totpCodeFor` and the `Device` type used by `enrolAuthenticatorApp` and `loginDeviceWith`.

## Notes

- `submitLoginForm` is intentionally assertion-free; a wrong password, a 2FA prompt, and a successful session are all valid results. Callers add their own `.should()` after.
- `loginDeviceWith` exists specifically for accounts whose password was changed *during* the journey; seeded accounts with known credentials should use `loginDevice` from the harness instead.
- `letTimePass` is only for short windows (resend cooldowns, token grace periods). Journeys needing a long time jump call `cy.travel` directly and are demo-profile-only.
- `enrolAuthenticatorApp` is a multi-step compound action (navigates, reads, generates a code, confirms, dismisses codes). It returns the secret so the caller can answer subsequent sign-in challenges with `totpCodeFor`.
- The base32 secret regex `[2-7A-Z]{16,}` excludes `0`, `1`, `8`, `9` (valid base32 alphabet) and is case-sensitive.
