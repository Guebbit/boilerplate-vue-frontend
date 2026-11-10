---
source: src/modules/account/tests/e2e/password-reset.cy.ts
sha256: e866aaf8101d4b9a5de1c8325ee8e327dffe50a2a69e145313733795884ace62
signature: e866aaf8101d4b9a5de1c8325ee8e327dffe50a2a69e145313733795884ace62
generated_at: 2026-11-10T03:33:32.744314+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/password-reset.cy.ts

## Purpose

End-to-end test for the forgot-password flow. Rather than assuming a reset URL, the test reads the actual link from the demo backend's email outbox (or a live Mailpit inbox) and follows it, proving the mailed link is the one that works. It then verifies both halves of the outcome at the login form: the pre-reset password is dead and the new password is accepted. A second case confirms that a fabricated token changes nothing.

## Key elements

- **`describe('Password reset', …)`** — top-level suite; `beforeEach` visits `/en`, calls `cy.restore()` to reset app state, then revisits `/en`.
- **Test: "the emailed link replaces the forgotten password"** — full happy-path: submits the reset-request form, asserts the enumeration-safe acknowledgement copy, retrieves the email via `cy.emailTo`, validates the template with `expectMailTemplate`, navigates to `mailedLinkUrl(email)`, fills both password fields on the confirm page, submits, then proves the old password no longer logs in and the new one does.
- **Test: "a token nobody was sent changes nothing"** — navigates directly to `/en/password-reset/confirm#token=a-token-nobody-issued`, submits a new password, asserts the confirm page stays (no redirect) and the success copy is absent, then logs in with the *original* password to confirm nothing was changed.
- **Imports** — `seedAccount` from `tests/support/e2e/scenario`; `expectMailTemplate` and `mailedLinkUrl` from `tests/support/e2e/commands`.

## Relationships

- **`tests/support/e2e/scenario.ts`** — provides `seedAccount('user')`, the single call that yields the email and pre-set password used throughout both tests.
- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate` (asserts the correct email template was sent) and `mailedLinkUrl` (extracts the reset URL from the email body).

## Notes

- The first test is gated by `cy.skipUnlessMailbox()`; it will be silently skipped in environments without a reachable mail backend.
- The reset-request acknowledgement is checked for the exact phrase **"If the account exists"** — this is the enumeration-safe response the server returns regardless of whether the address is registered.
- The confirm form has **two** password inputs (new + confirm), addressed via `.eq(0)` and `.eq(1)`.
- The second test navigates to the confirm URL with a fake token in the **hash fragment** (`#token=…`), not a query parameter, matching how the app routes reset tokens.
