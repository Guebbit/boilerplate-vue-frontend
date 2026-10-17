---
source: tests/e2e/specs/journeys/ac16-two-factor-awkward-edges.cy.ts
sha256: c35e2287f1c140642a7bd9f3c2a7eae3dc4f2c9240532061a1609a812542e597
generated_at: 2026-10-17T02:05:18.283768+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac16-two-factor-awkward-edges.cy.ts

## Purpose

End-to-end journey test (AC16) that exercises the awkward edge cases of email two-factor authentication: arming is blocked until the address is verified, a cancelled factor replacement leaves the panel in the correct state, the resend button enforces a cooldown countdown, the sixth wrong guess is refused with a 429, an expired challenge disables its submit button, and an email-only account can disable 2FA by mailing itself a code without spending a backup code.

## Key elements

- **`EMAIL` / `PASSWORD`** – Test-account credentials (`awkward.edges@example.com`).
- **`PAST_RESEND_COOLDOWN_MS`** (31 000) – Duration to `letTimePass` beyond `DELIVERED_CODE_RESEND_SECONDS` so a fresh code can be requested.
- **`GUESSES_ALLOWED`** (5) – Number of 422-answered wrong guesses before the 6th receives a 429.
- **`PAST_CHALLENGE_MS`** (11 min) – Ticks the fake browser clock past the challenge's 10-minute TTL.
- **`armEmailFromPanel(mintsBackupCodes: boolean)`** – Enrolls email 2FA from the profile panel; when `mintsBackupCodes` is true it also dismisses the newly revealed backup-code dialog.
- **`watchGuesses()`** – Registers a single `cy.intercept` on `POST **/account/login/2fa` under the alias `guess`; must be called exactly once before the first guess to avoid alias-collision under load.
- **`guess(code, expectedStatus)`** – Types a code, clicks submit, and asserts the intercepted response status.
- **`expectChangeNoticeMailed(address)`** – Asserts the outbox contains an `account.two-factor-changed` template; skipped when `liveProfile` is true (SMTP inbox has no template metadata).
- **`describe` / single `it`** – One narrative test (via `cy.step`) walking through: unverified block → verify → arm → replace + cancel → re-arm → resend cooldown → guess limit → locked-out state → expired challenge → disable 2FA → change-notice mail.

## Relationships

- **`tests/support/e2e/steps.ts`** – Provides `signInWith` and `signUp` used for the sign-up, re-login, and final sign-in steps.
- **`tests/support/e2e/commands.ts`** – Provides `mailedLinkUrl` to extract and construct the verification-link URL from the inbox email.
- **`tests/support/e2e/security-steps.ts`** – Provides `dismissBackupCodes` (after first arm), `letTimePass` (to skip the resend cooldown), and `submitLoginForm` (to reach the 2FA challenge page).

## Notes

- **Single intercept, single alias.** `watchGuesses` is deliberately registered once before the loop. Registering a new `cy.intercept().as('guess')` per iteration would cause `cy.wait('@guess')` to resolve to an *earlier* completed request under load, making the 6th guess read the 5th's 422 instead of its own 429.
- **Browser clock, not server clock.** The expired-challenge step uses `cy.clock(Date.now(), ['Date'])` because the UI countdown reads the *browser's* `Date`. The clock must be restored before subsequent real sign-ins.
- **`mintsBackupCodes` flag.** First-time arming reveals a fresh backup-code set (account had none); a re-arm after cancel keeps existing codes because they recover the *account*, not the method.
- **Live-profile guard.** `expectChangeNoticeMailed` skips the template assertion when `liveProfile === true`, since a real SMTP inbox only carries the rendered HTML, not the template name.
- **Requires a mailbox.** The test calls `cy.skipUnlessMailbox()` and depends on `typeMailedTwoFactorCode` throughout; it will be skipped in environments without an SMTP capture.
- **`requires-module: account`.** The header comment signals this test needs the `account` feature flag / module enabled to run.
