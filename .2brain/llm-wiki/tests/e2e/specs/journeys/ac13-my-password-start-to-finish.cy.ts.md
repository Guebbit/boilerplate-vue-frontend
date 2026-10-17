---
source: tests/e2e/specs/journeys/ac13-my-password-start-to-finish.cy.ts
sha256: 7836d98df7abb6b0f9a05a67f7e28928409d0a3e554254cf0c38ed19bf041e73
generated_at: 2026-10-17T02:04:39.730126+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac13-my-password-start-to-finish.cy.ts

## Purpose

End-to-end journey test for AC13 ("My password, start to finish"). It verifies the full password lifecycle: changing a password from the profile, recovering one via a mailed reset link, breached-password warnings on all three forms, API-worded rejections for wrong credentials, session invalidation on other devices, single-use reset links, and enumeration-safe responses for unknown addresses.

## Key elements

- **`BREACHED`** (`'Password1!'`) — a password on the backend's bundled breach list that still passes composition rules; used to trigger warnings on the change, reset, and signup forms.
- **`CHANGED` / `RESET`** — fresh passwords used for the change and reset steps respectively.
- **`ACKNOWLEDGEMENT`** — the enumeration-safe text ("If the account exists") expected after any reset request.
- **`submitPasswordChange(current, next)`** — types all three profile password fields and clicks submit.
- **`requestReset(address)`** — visits `/en/password-reset`, types an address, submits, and asserts the acknowledgement copy.
- **`submitReset(password)`** — fills both fields on the reset-confirm page and submits.
- **`expectResetNoticeMailed(address)`** — asserts the `account.reset-confirm` template was sent; skips the check when `liveProfile` is true (SMTP inbox has no template metadata).
- **`describe('AC13 …')` → `it('a change and a reset each replace…')`** — the main journey: breached-password warning, wrong-current-password rejection, valid change, session revocation (401 on second device), old-password login failure, reset flow, single-use link, and unknown-address acknowledgement.
- **`it('the signup form warns about a breached password…')`** — standalone check that the signup form shows the breach warning inline.

## Relationships

- **`tests/support/e2e/harness.ts`** — provides `loginDevice` (returns a phone handle with a `refresh` function) and `refreshDevice` (used to assert a 401 after session invalidation); also the `cy.restore()` alias called in `beforeEach`.
- **`tests/support/e2e/security-steps.ts`** — provides `loginDeviceWith` (logs in a second device and returns its handle) and `submitLoginForm` (fills the login page and submits, used for positive and negative credential checks).
- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate` (asserts a specific template in the demo outbox), `mailedLinkUrl` (extracts the reset URL from the mail body), and `cy.emailTo` / `cy.skipUnlessMailbox` (mailbox interaction guards).

## Notes

- **Mailbox required.** The test calls `cy.skipUnlessMailbox()` and reads the outbox for the reset link and the reset-confirmation notice. Without a mailbox (demo outbox or live Mailpit) the journey cannot run.
- **`liveProfile` env flag.** When true, `expectResetNoticeMailed` skips the template assertion because a live SMTP inbox only contains the rendered HTML, not the template name.
- **"Signed out" is defined as a 401 on the device's refresh token**, not a UI logout.
- **Breached-password rejection text** is asserted to contain "data breach" but *not* "Unprocessable Entity" — the API's own wording surfaces in the UI.
- **Reset link is single-use:** opening it a second time and submitting must produce an error on the same page (not a redirect), and the password must not change.
- **`requires-module: account`** comment at the top of the file indicates this spec depends on the `account` backend module being available.
