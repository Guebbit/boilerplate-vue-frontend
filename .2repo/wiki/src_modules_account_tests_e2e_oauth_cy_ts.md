# src/modules/account/tests/e2e/oauth.cy.ts

## Purpose

Cypress end-to-end tests that exercise the OAuth social-login button click-through against the backend's `fake` provider. Because real Google/GitHub consent screens cannot be automated in CI, the fake provider substitutes for them while still round-tripping the genuine `state` cookie and the full redirect chain (BE start → BE callback → cookies → FE `/oauth/callback`). The file exists to verify both the new-account-creation path and the account-linking path without external dependencies.

## Key elements

- **`describe('Social login (OAuth)')`** — top-level suite; `beforeEach` visits `/en`, resets app state, and re-visits.
- **Test 1: "a new visitor signs in through the fake provider and lands home, already verified"** — clicks `[data-test=oauth-fake]`, asserts landing on `#home-page`, confirms the user menu is visible, then checks `/en/profile` shows `oauth.demo@example.com` with no verification banner (the fake identity is pre-verified).
- **Test 2: "links to an existing password account sharing the verified email, not a duplicate"** — first creates an unverified password account with the same email (`oauth.demo@example.com`), then signs in via the fake provider, asserts the account is now verified (no banner), and finally logs out and back in with the original password to prove the password credential still works on the *same* account.

## Notes

- **Demo-only:** Both tests call `cy.skipUnlessDemo()`; the `fake` provider is gated behind `isDemoMode()` on the backend, so these tests are silently skipped in non-demo environments.
- **Real redirect chain, fake consent:** Although the provider is fake, the `state` cookie round-trip and the BE→FE callback path are the production code paths under test.
- **Test 2 intentionally leaves the password account unverified** before the OAuth sign-in, to prove that linking a verified provider identity marks the shared account verified without consuming an emailed token.
- **Selectors used:** `data-test=oauth-fake`, `data-test=user-menu`, `data-test=verify-banner`, `#home-page`, `#login-page`, `#signup-page`, `#profile` (implied by route), and standard form inputs (`[type=email]`, `[type=password]`, `[type=checkbox]`).
- **No graph neighbors** are reported; the file is a leaf in the dependency graph (pure test, no imports beyond Cypress globals).
