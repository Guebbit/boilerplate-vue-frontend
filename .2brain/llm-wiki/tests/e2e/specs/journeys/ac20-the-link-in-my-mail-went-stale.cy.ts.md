---
source: tests/e2e/specs/journeys/ac20-the-link-in-my-mail-went-stale.cy.ts
sha256: 930242abbcad62ac0c4f2574499a5585f610943f1c337d44a5c3dc2e1f84b9ef
generated_at: 2026-10-17T02:06:03.564099+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac20-the-link-in-my-mail-went-stale.cy.ts

## Purpose

End-to-end (Cypress) test for acceptance criterion 20: emailed action links (verify, password-reset, account-deletion) must expire after their respective windows and present a clear in-page error, while a freshly re-issued link still succeeds. The final scenario covers the admin-invite flow (setup mail → invitee sets password → sign-in). The test is demo-only because it advances the backend clock with `cy.travel`.

## Key elements

- **`PAST_AN_HOUR_MS` / `PAST_A_DAY_MS`** — duration constants (2 h / 23 h) chosen to land outside the 1 h reset window and the 24 h verify window respectively.
- **`DOOMED_EMAIL`, `PASSWORD`, `RESET_PASSWORD`, `INVITEE_EMAIL`, `INVITEE_PASSWORD`** — fixture addresses and passwords used throughout the single test case.
- **`followAndConfirm(link, submit)`** — helper that visits a mailed URL and clicks the page's confirm button.
- **`setPasswordFromLink(password)`** — helper that types a new password into both fields on `#password-reset-confirm-page` and submits.
- **`requestReset(email)`** — helper that fills the public `/en/password-reset` form and confirms the confirmation message appears.
- **`describe` / `it` block** — one test case narrated with `cy.step` calls, exercising: stale verify link, stale reset link, single-use deletion link, fresh verify re-send, fresh reset re-send + sign-in, and the admin-invite → setup-password → sign-in path.

## Relationships

- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate` (asserts a captured mail's template name) and `mailedLinkUrl` (extracts the action URL from a mail object).
- **`tests/support/e2e/steps.ts`** — provides `signUp` (creates an account via the UI), `signInWith` (logs in and asserts success), and `carriesAnotherLink(staleUrl)` (a mail-filter predicate ensuring the newly captured mail contains a *different* link than a previously captured one, i.e. a fresh token).

## Notes

- Gated by `cy.skipUnlessDemo()`; it relies on `cy.travel`, a demo-backend clock-manipulation command not available in production or CI.
- `beforeEach` calls `cy.restore()` between page visits to reset demo-state (accounts, mails) so each step starts clean.
- The deletion-link "one-time" behavior is fixed in application code (not a TTL), so the test simply uses the same link twice and expects an error on the second attempt.
- The single `it` contains many sequential steps rather than separate `it` blocks; a failure in an early step makes all later steps unreachable.
