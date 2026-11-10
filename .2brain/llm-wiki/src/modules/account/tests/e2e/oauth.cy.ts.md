---
source: src/modules/account/tests/e2e/oauth.cy.ts
sha256: c0cadd1c6919055e93c1004526cfb4a3643b7296aa071cd536f8dfc704faf65f
signature: d90b70ac4931de5cd26fcd00d21e46f5cb6838a452d0287dc74c347743ffdbcd
generated_at: 2026-11-10T03:33:05.195040+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/oauth.cy.ts

## Purpose

Cypress end-to-end suite covering the OAuth login flow against the backend's `fake` provider. Real Google/GitHub cannot run in CI, but `fake` still round-trips the genuine `state` cookie and redirect chain (BE start → BE callback → cookies → FE `/oauth/callback`), so the tests exercise the real integration path. All tests are gated behind `isDemoMode()` on the backend.

## Key elements

- **`signUpUnverified(password)`** — Local helper that registers `oauth.demo@example.com` with the given password, leaves the address unverified, signs in, then logs out. Establishes the pre-account-takeover starting state for the second and third tests.
- **`describe('Social login (OAuth)')`** — The suite. `beforeEach` calls `cy.restore()` to reset fixture state, then revisits `/en`.
- **Test: "a new visitor signs in through the fake provider…"** — Happy path: click `[data-test=oauth-fake]`, assert landing on `#home-page` with a pre-verified identity (no `verify-banner`).
- **Test: "refuses to link onto an account that never proved the address"** — Pre-account-takeover guard: OAuth must return `error=account_unverified` and must not link; the squatter's password still works on the unproven account.
- **Test: "links nothing on a sign-in whose email matches…"** — NIST SP 800-63B-4 §3.8.1: sign-in never links by email match (`error=account_exists`). The owner must sign in with the password and connect the provider from the profile page. Verifies both sign-in methods still work on the same account afterward.
- **Test: "challenges a linked provider login when the account has 2FA armed"** — 2FA enrolled on the password path must also gate a linked-provider sign-in (redirects to `/login/2fa` challenge page).

## Relationships

No dependency-graph neighbors are recorded for this file. At runtime it relies on several custom Cypress commands (`cy.skipUnlessDemo`, `cy.emailTo`, `cy.enrollEmailTwoFactor`, `cy.typeMailedTwoFactorCode`, `cy.restore`) and targets front-end UI elements by `data-test` attribute on routes `/en/login`, `/en/signup`, `/en/profile`, and `/en/verify-email/confirm`.

## Notes

- Every test calls `cy.skipUnlessDemo()`; the suite is a no-op outside demo mode.
- The `fake` provider is the *only* way to exercise the real `state`-cookie redirect chain in CI; do not replace it with a static mock.
- Test 3 intentionally verifies the email token **as a guest** (no active session) to mirror the real-world "open the link on another device" scenario.
- The comment referencing `loginOrCreateFromOAuth`'s create branch is a documentation cross-reference, not an import — the test validates behavior, not that function directly.
