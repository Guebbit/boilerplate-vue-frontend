---
source: tests/e2e/specs/journeys/ac22-i-disconnected-the-provider.cy.ts
sha256: ec3319011c6e503a3da6ed7ef23422d4899f1db0b21cec0cedc1cb56d16f76e1
signature: c751647b816b9fc5db9e41c45d16c17fb69e9e1ef4cd686be32e5031b2ef8c82
generated_at: 2026-11-10T06:47:34.016342+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ac22-i-disconnected-the-provider.cy.ts

## Purpose

End-to-end (Cypress) acceptance test for **AC22**: an account that has both a password and an OAuth provider connected removes the provider. The test verifies the full removal journey — re-authentication when the fresh-login window has lapsed, email notifications for the method change, the password continuing to work, a reset confirmation reflecting "no provider connected," and the provider's next sign-in being refused until the owner reconnects it.

## Key elements

- **`registerAndVerify()`** — Local helper. Signs up via the UI, then confirms the email in a fresh (guest) tab to prove the address, leaving the session signed out.
- **`signInAndConnectProvider(password)`** — Local helper. Logs in with the given password, navigates to `/en/profile`, and clicks the "connect fake provider" button, asserting the provider appears in the connected list.
- **Constants** — `EMAIL`, `PASSWORD`, `RESET_PASSWORD` (test credentials), `PAST_SENSITIVE_MS` (1 000 000 ms, past the 900 s fresh-login window), `METHOD_NOTICE` (mail template name for sign-in-method changes).
- **Single `it` block** — Walks through seven `cy.step` sections: connect provider → lapse window & remove (with wrong/right password re-auth) → verify "removed" mail → password still signs in → reset flow asserts no provider → provider sign-in refused (`error=account_exists`) → reconnect from profile.

## Relationships

- **`tests/support/e2e/commands.ts`** — Supplies `byTemplate` (predicate for mail-template matching), `expectMailTemplate` (asserts a mail's template), and `mailedLinkUrl` (extracts the URL string from a mailed link).
- **`tests/support/e2e/security-steps.ts`** — Supplies `submitLoginForm` (fills and submits the login form), `requestReset` (triggers a password-reset request), and `submitReset` (submits the new-password form).
- **`scripts/e2e/mail-message.ts`** — Supplies `mailMentions`, used in mail assertions to confirm the mail body contains phrases like *"was connected"*, *"was removed"*, and *"No Google or GitHub sign-in is connected"*.

## Notes

- Gated behind `cy.skipUnlessDemo()`; the fake OAuth provider and `cy.travel` (demo-backend clock manipulation) are **demo-environment only**.
- `beforeEach` calls `cy.restore()` to reset demo state between runs.
- `PAST_SENSITIVE_MS` is deliberately set just above the 900 s sensitive window so the access token has also lapsed, forcing a refresh before the re-auth prompt appears.
- The `// requires-module: account` comment at the top is a module-dependency annotation for the test harness, not a runtime import.
