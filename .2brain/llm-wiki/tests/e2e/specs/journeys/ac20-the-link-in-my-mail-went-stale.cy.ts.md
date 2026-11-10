---
source: tests/e2e/specs/journeys/ac20-the-link-in-my-mail-went-stale.cy.ts
sha256: 0fe2f5869f2d3c67ce83e032326d24d23f842e8bb0b1a89bfb88c75733402084
signature: 63ab06d6a4458e792bb9112819e090aeaf987cd913f0777991885e46a92657b2
generated_at: 2026-11-10T06:46:54.869410+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac20-the-link-in-my-mail-went-stale.cy.ts

## Purpose

End-to-end journey test for AC20: emailed links (verify, password-reset, deletion-restore) must expire after their respective TTLs and present a human-readable error on their own page, while a freshly requested link still works. The test also covers the admin-invite setup flow (admin creates a user → setup mail → recipient sets a password). Because it manipulates the demo backend's clock, it is gated to demo mode.

## Key elements

- **`PAST_AN_HOUR_MS` / `PAST_A_DAY_MS`** – Time offsets (2 h and 23 h) passed to `cy.travel` to push the clock past the 1 h reset TTL and the 24 h verify TTL respectively.
- **`DOOMED_EMAIL`** – Throwaway account used to exercise the one-use deletion/restore link.
- **`followAndConfirm(link, submit)`** – Visits a mailed link and clicks the named confirm button.
- **`setPasswordFromLink(password, acceptTerms?)`** – Fills both password fields on the `#password-reset-confirm-page`, optionally checks the terms checkbox (needed for staff-created accounts), and submits.
- **`requestReset(email)`** – Fills and submits the public `/en/password-reset` form; asserts the generic "If the account exists" confirmation.
- **`describe('AC20 …')` / single `it`** – The entire journey as one long test with `cy.step` markers covering: stale verify link, stale reset link, used-once deletion link, fresh verify mail, fresh reset mail + sign-in, and admin invite + invitee sign-in.

## Relationships

- **`tests/support/e2e/commands.ts`** – Provides `expectMailTemplate` (asserts the mail's template name) and `mailedLinkUrl` (extracts the href from a captured mail). Both are called throughout the test to read and validate outgoing mail.
- **`tests/support/e2e/steps.ts`** – Provides `signUp` (creates an account via the UI), `signInWith` (logs in with given credentials), and `carriesAnotherLink` (a mail-matching predicate that ensures the captured mail contains a link different from the previously stale one).

## Notes

- **Demo-only**: `cy.skipUnlessDemo()` is the first action in the test; `cy.travel` (time manipulation) is unavailable outside the demo backend. The whole file is meaningless in a production-adjacent E2E run.
- **`beforeEach` calls `cy.restore()`** to reset demo state (clock, seeded data) before each run, then revisits `/en` to re-establish session context.
- **`PAST_A_DAY_MS` is 23 h, not 24 h** — it is added *on top of* the 2 h already traveled, so the total elapsed time (25 h) exceeds the 24 h verify TTL. Reading the constant in isolation is misleading.
- **Deletion link is one-use, not time-based**: the test restores the link once (success) then immediately reuses it (error), without any `cy.travel`.
- **Invite flow requires the terms checkbox**: `setPasswordFromLink` is called with `acceptTerms = true` only for the admin-created account; the self-service reset flow does not show that checkbox.
- **After a successful restore, the user is *not* signed in** — the page lands on `#login-page`. The test asserts this explicitly.
