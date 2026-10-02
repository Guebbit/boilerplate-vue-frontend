---
source: src/modules/account/tests/e2e/oauth.cy.ts
sha256: 4ad865c30cbeed2d027493328e8ec995b89a2461750e947e587bf18e8fd6edc5
generated_at: 2026-10-02T12:23:06.493920+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/oauth.cy.ts

## Purpose

Cypress e2e suite for the OAuth login buttons, exercising the full redirect chain (BE start route → BE callback → cookie set → FE `/oauth/callback`) via the backend's `fake` provider. Real Google/GitHub flows can't run in CI; `fake` skips the consent screen but still round-trips the genuine `state` cookie, making the redirect path authentic. All tests are gated to demo mode.

## Key elements

- **`signUpUnverified(password: string)`** — Local helper. Registers `oauth.demo@example.com` with the given password via the signup form, signs in (confirming session cookies are set), then logs out. Leaves the address *unverified*; serves as the starting state for the takeover and link tests.
- **`describe('Social login (OAuth)')`** — Suite containing four `it` blocks, each preceded by `cy.skipUnlessDemo()`:
  - *New visitor signs in…* — Clicks `[data-test=oauth-fake]`, asserts redirect to `#home-page`, user menu present, and profile shows the email with no verify banner.
  - *Refuses to link onto an account that never proved the address* — Sets up an unverified squatter account, then asserts the OAuth callback lands on `error=account_unverified` and the original password still works with a verify banner still present.
  - *Links to an existing password account once… proved the email* — Verifies via a mail-delivered token as a guest, then confirms the provider links onto the *same* account (same email, no verify banner, original password still valid).
  - *Challenges a linked provider login when the account has 2FA armed* — Enrolls email 2FA on a provider-created account, then asserts a second OAuth login hits the 2FA challenge page and completes only after the mailed code is submitted.

## Relationships

No graph-neighbor files are registered for this module. At runtime it depends on:

- **Backend `fake` OAuth provider** (gated by `isDemoMode()`): start route, callback handler, and the `loginOrCreateFromOAuth` create/link logic.
- **Frontend routes:** `/en/login`, `/en/signup`, `/en/profile`, `/en/verify-email/confirm`, `/en/login/2fa`, and the `#oauth-callback-page` element.
- **Custom Cypress commands** (defined elsewhere in the e2e support layer): `cy.restore()`, `cy.skipUnlessDemo()`, `cy.emailTo()`, `cy.enrollEmailTwoFactor()`, `cy.typeMailedTwoFactorCode()`.

## Notes

- **Demo-only:** Every test calls `cy.skipUnlessDemo()`; the `fake` provider is unreachable in production or non-demo builds. The file will silently skip in those environments.
- **`cy.restore()` in `beforeEach`:** Resets DB/seed state between tests; paired with a fresh `cy.visit('/en')` to re-establish session.
- **No explicit imports:** The file relies entirely on global `cy` and the custom commands registered via the Cypress support file—there are no module-level imports or exports.
- **Test 4 is a regression guard** (referenced as "1b" in the comment): it ensures the OAuth callback cannot mint a session that bypasses an armed second factor.
