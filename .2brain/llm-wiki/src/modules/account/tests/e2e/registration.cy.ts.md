---
source: src/modules/account/tests/e2e/registration.cy.ts
sha256: 147d2159e0c0398946fc75b559dfcafc9bad642b91e84e1dfccaa5de2d59edca
signature: 147d2159e0c0398946fc75b559dfcafc9bad642b91e84e1dfccaa5de2d59edca
generated_at: 2026-11-10T03:34:10.711155+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/registration.cy.ts

## Purpose

Cypress e2e suite that exercises the full registration arc — signup → unverified session → email-token spend as a *guest* → password-gate verification — while deliberately crossing real page reloads so the server-side account must genuinely persist between steps.

## Key elements

- **`describe('Registration')`** — top-level suite; `beforeEach` visits `/en`, runs `cy.restore()`, then re-visits to isolate state.
- **Test: "a visitor signs up, spends the emailed token as a guest, and logs in verified"** — Full happy-path arc: fills the signup form, asserts the unverified banner, logs out, pulls the verification link from the demo outbox, spends the token as a guest, then proves the password gate rejects a wrong password and accepts the correct one, finally confirming the banner is gone on `/en/profile`.
- **Test: "an unverified account shows the banner until the emailed token is spent"** — Verifies the banner persists across `/en/profile` *before* the inbox is touched, checks that clicking **Resend** disables the button (cooldown guard), then confirms the banner clears after the token is spent.
- **`cy.skipUnlessMailbox()`** — Guards both tests; they only run when a mailbox (demo outbox or Mailpit) is available.
- **Selector conventions** — Uses `[data-test=signup-terms-accepted]` to target *only* the required terms checkbox (a second optional `analyticsConsent` checkbox shares the form). Uses `.eq(0)` / `.eq(1)` to distinguish the two password inputs.

## Relationships

- **`tests/support/e2e/commands.ts`** — Source of the two imported helpers used in both tests: `expectMailTemplate(email, templateName)` (asserts the correct mail template was rendered) and `mailedLinkUrl(email)` (extracts the verification URL from the message body). The file calls `mailedLinkUrl` to get the URL to visit in the token-spend step, and `expectMailTemplate` to confirm the right template was rendered before following the link.

## Notes

- The mid-test `cy.logout()` is intentional: the verification link must be opened in a *guest* context to mirror the real "open from inbox on a different device" path. Without it, the token spend would be authenticated and the test would not prove the token is a sufficient credential on its own.
- The resend-cooldown assertion (`should('be.disabled')`) is a UI-level check; the test does **not** verify the HTTP 429 directly.
- Both tests hard-code distinct example.com addresses (`new.customer@…`, `slow.reader@…`) so `beforeEach`'s `cy.restore()` keeps them independent.
- The file relies on `#signup-page`, `#home-page`, `#login-page`, `#profile-page` as page-level landmark IDs and `[data-test=…]` attributes for sub-elements — if those shift in the DOM, these tests break before the app logic is even reached.
