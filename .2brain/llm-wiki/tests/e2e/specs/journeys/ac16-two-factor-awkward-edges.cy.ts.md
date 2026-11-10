---
source: tests/e2e/specs/journeys/ac16-two-factor-awkward-edges.cy.ts
sha256: 92c6c28da681dbe6c8a9f8bd991eb61a7ec9071f9ea27e15b7b187aea288bd0a
signature: 871704f1cec780579df611f79ae0b94833507eed78afe38c12624fe590ea9e47
generated_at: 2026-11-10T06:45:54.932234+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac16-two-factor-awkward-edges.cy.ts

## Purpose

End-to-end journey test for AC16 covering the "awkward edge" cases of two-factor authentication: an unverified account being blocked from arming 2FA, replacing and cancelling a factor, login-challenge guess limits and expiry, and an email-only account disabling 2FA without spending a backup code. Requires a mailbox for verification links and all codes.

## Key elements

- **`armEmailFromPanel(mintsBackupCodes)`** — Clicks through the panel to add email 2FA, reads the mailed code, confirms, and optionally dismisses newly-minted backup codes.
- **`watchGuesses()`** — Registers a single `cy.intercept` on the 2FA login POST under alias `'guess'`. Deliberately called once before the first guess to avoid alias-collision bugs where multiple intercepts on the same alias cause `cy.wait('@guess')` to resolve to an earlier request.
- **`guess(code, expectedStatus)`** — Types a code into the challenge input, submits, and asserts the HTTP status from the intercepted response.
- **`expectChangeNoticeMailed(address)`** — Asserts a "two-factor changed" template email was sent; skips the template assertion when running against a live profile (no demo outbox).
- **Constants** — `EMAIL`, `PASSWORD`, `PAST_RESEND_COOLDOWN_MS` (31 s, just over the server's `DELIVERED_CODE_RESEND_SECONDS`), `GUESSES_ALLOWED` (5, matching `NODE_MFA_CHALLENGE_MAX`), `PAST_CHALLENGE_MS` (11 min, just over the 10-min challenge TTL).
- **`describe` / `it` block** — Single test that walks through: unverified → verify → arm → replace → cancel → re-arm → login resend countdown → five wrong + one refused guess → locked-out state → expired-challenge disabled submit (via `cy.clock`) → disable 2FA without backup code → change-notice email.

## Relationships

- **`tests/support/e2e/steps.ts`** — Provides `signUp` and `signInWith` used for account creation and re-authentication between steps.
- **`tests/support/e2e/commands.ts`** — Provides `mailedLinkUrl` to extract the verification URL from a captured email.
- **`tests/support/e2e/security-steps.ts`** — Provides `dismissBackupCodes` (dismissing the one-time backup-code reveal), `letTimePass` (advancing the resend cooldown), and `submitLoginForm` (filling and submitting the login form to reach the 2FA challenge page).

## Notes

- **Mailbox required.** The test calls `cy.skipUnlessMailbox()` and will skip in environments without a configured mailbox.
- **`cy.clock` usage.** The expired-challenge step freezes the browser clock (`Date`) and ticks past the 10-minute TTL, then restores it. Any subsequent real sign-in in the same test depends on the restore having happened.
- **Intercept alias discipline.** `watchGuesses` is intentionally called once, outside the `guess` loop. Registering a new intercept per guess under the same alias would make `cy.wait('@guess')` non-deterministic under load (the sixth guess could read the fifth's 422 instead of its own 429).
- **Doc comment is partially stale.** The top-of-file comment states the "email-only user turning 2FA off without a backup code" journey is *not* covered (waiting on JB17), but the test body now includes that scenario as its final step. The comment should be updated if this is intentional.
- **Live vs. demo profile.** `expectChangeNoticeMailed` checks `cy.env('liveProfile')` to skip the template assertion, since a real SMTP inbox only carries the rendered message, not the template name.
