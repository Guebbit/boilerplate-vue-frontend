---
source: src/modules/account/tests/e2e/registration.cy.ts
sha256: 147d2159e0c0398946fc75b559dfcafc9bad642b91e84e1dfccaa5de2d59edca
generated_at: 2026-10-02T12:24:08.581817+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/registration.cy.ts

## Purpose

Cypress end-to-end spec covering the full registration arc: a visitor signs up, the session is established immediately (account lands as `unverified` with a banner), the user logs out to simulate a separate device, the emailed verification token is spent as a guest, and the password gate is proven (wrong password refused, correct password accepted). It also verifies that the unverified banner persists on every page until the token is actually consumed.

## Key elements

- **`describe('Registration')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` (fixture reset) before re-visiting.
- **`it('a visitor signs up, spends the emailed token as a guest, and logs in verified')`** — the full happy-path arc: signup form fill → assert `#home-page` + `[data-test=verify-banner]` → `cy.logout()` → `cy.emailTo(...)` to pull the verification email → `cy.visit(mailedLinkUrl(email))` → submit verification → assert success message → negative login (wrong password stays on `/login`) → positive login (URL leaves `/login`) → profile page shows no banner.
- **`it('an unverified account shows the banner until the emailed token is spent')`** — narrower check: banner is present on Home *and* Profile before any email interaction; clicking `[data-test=verify-resend]` disables the button (server cooldown respected); spending the token removes the banner from all pages.

## Relationships

- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate(email, templateId)` (asserts the email body matches a known template) and `mailedLinkUrl(email)` (extracts the actual hyperlink from the message). Also supplies the custom commands used throughout: `cy.emailTo(addr)`, `cy.skipUnlessMailbox()`, `cy.restore()`, and `cy.logout()`.

## Notes

- **Two checkboxes on the signup form.** The form now contains both a required `signup-terms-accepted` and an optional `analyticsConsent` checkbox. Tests target the required one with the `data-test` attribute rather than a bare `[type=checkbox]` selector, which would check both.
- **`cy.skipUnlessMailbox()`** guards both tests; they are skipped when no Mailpit/demo outbox is available (e.g., CI without the fixture).
- **Deliberate mid-test logout.** The logout between signup and token-spending is intentional: it forces the second half to run as a *guest*, matching the real-world case where the verification link is opened from a different device/browser than the one that signed up.
- **`cy.restore()` in `beforeEach`** resets DB state between tests; it must be called after the first `cy.visit` (Cypress requirement) and before the meaningful visit.
