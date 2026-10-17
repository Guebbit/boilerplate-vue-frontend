---
source: tests/support/e2e/security-steps.ts
sha256: 718850e9973f0062c1b2a032b01ec2c8312e67c444785a0ba66d7483972e64c9
generated_at: 2026-10-17T02:26:50.333479+00:00
model: ollama:qwen3.8:27b
---

# tests/support/e2e/security-steps.ts

## Purpose

Shared, assertion-light Cypress steps for the account-security journeys (AC1, AC2, AC13, AC16, AC17). Each function drives a single UI interaction — submitting the login form, entering a backup code, dismissing the one-time reveal screen, or signing in as a second device — so that journey specs can compose them without repeating selectors or branching on demo-vs-live backend.

## Key elements

- **`submitLoginForm(email, password)`** — Types credentials into `/en/login` and submits the form. Deliberately makes no assertion about where the app lands (session, 2FA challenge, or error are all valid outcomes).
- **`loginToChallenge(account)`** — Calls `submitLoginForm` then asserts `#two-factor-challenge-page` is visible. Convenience wrapper for journeys that expect a 2FA prompt.
- **`submitBackupCode(code)`** — Switches the challenge page to backup-code mode and submits a single code.
- **`revealedBackupCodes()`** — Yields an array of trimmed code strings from the one-time reveal list.
- **`dismissBackupCodes()`** — Clicks through the confirm/continue buttons and asserts the backup-codes block is removed from the DOM.
- **`loginDeviceWith(email, password)`** — Signs in as a *second* device by calling the `deviceLogin` Cypress task (useful when a journey has already changed the password, so the seeded `loginDevice` helper no longer works). Returns a `Cypress.Chainable<Device>`.
- **`letTimePass(ms)`** — Advances time by `ms`. In demo mode it calls `cy.travel(ms)` (backend clock jump); in live mode it simply `cy.wait(ms)`.

## Relationships

- **`tests/support/e2e/harness.ts`** — Source of the `Device` type imported here. Also provides the custom commands the steps reference (`cy.accountOf`, `cy.travel`, `loginDevice`, `refreshDevice`, `requestAsDevice`). `loginDeviceWith` is the explicit complement to the harness's `loginDevice` when the seeded password is no longer valid.
- **`scripts/e2e/device-session.ts`** — Registers the `deviceLogin` Cypress task that `loginDeviceWith` invokes via `cy.task('deviceLogin', …)`.
- **Journey specs** (`ac1-lost-my-phone`, `ac2-authenticator-app`, `ac13-my-password-start-to-finish`, `ac16-two-factor-awkward-edges`, `ac17-copied-session-cookie`) and **`src/modules/account/tests/e2e/two-factor.cy.ts`** — Consumers that import and compose these step functions in order, adding their own assertions between calls.

## Notes

- Functions are pure `cy` chains with no module-level state; they follow the same convention as `steps.ts` (plain functions, no classes).
- `submitLoginForm` clears each field before typing to guard against pre-filled values.
- `letTimePass` is intended for short windows (resend cooldowns, token grace periods, a few seconds). Journeys that need a long time jump should use `cy.travel` directly and are then demo-only.
- `revealedBackupCodes` is a read-only step; `dismissBackupCodes` is destructive — once called the codes are unrecoverable in the UI, so specs must read them first.
