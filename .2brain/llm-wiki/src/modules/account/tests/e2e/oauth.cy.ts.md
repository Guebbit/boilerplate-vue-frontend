---
source: src/modules/account/tests/e2e/oauth.cy.ts
sha256: 60a3072d88bc9ee4e6eff9413b180441750de11a04c208ba537fd15b988a6073
generated_at: 2026-10-17T00:21:49.556788+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/oauth.cy.ts

## Purpose
Cypress e2e suite that exercises the OAuth login button against the backend's `fake` provider (demo-mode only). Because real Google/GitHub redirects cannot complete in CI, the `fake` provider substitutes the consent screen while still round-tripping the genuine `state` cookie, letting tests validate the full redirect chain: BE start → BE callback → cookies → FE `/oauth/callback`.

## Key elements
- **`signUpUnverified(password)`** — Helper that registers `oauth.demo@example.com` with a given password via the signup form, signs in (verifying the session), then logs out. Leaves the email unverified; used as the pre-state for the link-refusal and link-success tests.
- **`describe('Social login (OAuth)')`** — Suite containing four test cases (all gated behind `cy.skipUnlessDemo()`):
  - *New visitor signs in via fake provider* — asserts landing on home with a pre-verified identity, no verify banner.
  - *Refuses to link onto an unproven account* — pre-seeds a squatter account, then asserts the callback returns `error=account_unverified` and the original password still works (account untouched).
  - *Links to a verified password account* — proves the email via the signup token link, then asserts OAuth links to the same account (no duplicate) and the original password still opens it.
  - *Challenges linked-provider login when 2FA is armed* — enrolls email 2FA on a provider-created account, then asserts a second OAuth login hits the two-factor challenge page and completes after submitting the mailed code.
- **`beforeEach`** — Restores app state (`cy.restore()`) and revisits `/en` before each test.

## Relationships
No dependency-graph neighbors recorded for this file. It interacts at runtime with:
- The backend `fake` OAuth provider (gated by `isDemoMode()`).
- Custom Cypress commands defined elsewhere: `cy.skipUnlessDemo()`, `cy.emailTo()`, `cy.enrollEmailTwoFactor()`, `cy.typeMailedTwoFactorCode()`.
- Front-end pages/elements referenced by selectors: `#oauth-callback-page`, `#home-page`, `#two-factor-challenge-page`, `[data-test=oauth-fake]`, `[data-test=verify-banner]`, `[data-test=user-menu]`.

## Notes
- Every test calls `cy.skipUnlessDemo()` — the entire suite is a no-op outside demo mode.
- The `beforeEach` calls `cy.restore()` then `cy.visit('/en')`; the first `cy.visit('/en')` at the top of the block is redundant (likely a leftover) but harmless.
- The account-takeover refusal test is the security-critical case: it pins the invariant that a provider's attestation alone must never link onto an email the account owner has not proven.
- `signUpUnverified` leaves the user **logged out**; the verify-link test intentionally consumes the token as a guest to mirror a "mailbox on another device" flow.
- The 2FA test depends on `cy.enrollEmailTwoFactor` and `cy.typeMailedTwoFactorCode` being registered in the test support setup.
