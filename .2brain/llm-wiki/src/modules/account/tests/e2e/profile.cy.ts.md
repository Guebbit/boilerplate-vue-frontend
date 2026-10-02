---
source: src/modules/account/tests/e2e/profile.cy.ts
sha256: 665519a553a217ce99d703c142de64d0cd4697153b8df76a1cb2b28a783da644
generated_at: 2026-10-02T14:49:37.772361+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/profile.cy.ts

## Purpose

Cypress e2e spec for the self-service account profile page. Exercises password change, session management, the address book, and email-verification UI against the real API in its demo profile. The tests pin the *page's* honouring of backend invariants (one default address, a `current` session flag, a `pendingEmail` park) rather than the rules themselves, which belong to backend tests.

## Key elements

- **`fillAddress(label, street)`** — Fills the six required inputs of the address dialog (label, name, street, zip, city) by input index, then selects "Italy" via the `v-autocomplete` country field and clicks save.
- **`loginFromAnotherDevice()`** — Wraps `loginDevice('user')` to create a second real session server-side, leaving the current cookie and `current` flag untouched.
- **`describe('Profile access')`** — Two guest-path specs: redirect to login with a `continue=` param; rejection of a fabricated verification token (422, no toast, no redirect).
- **`describe('Profile self-service')`** — Main block; `beforeEach` restores state, logs in as `user`, and navigates to `/en/profile`.
  - **language preference** — Saving a locale switches the page immediately and persists across a fresh login (asserted via URL match `/\/it(\/|$)/`).
  - **password change** — Happy path using `seedAccount('user').password`; wrong-current-password path asserts an inline error with the API's own sentence (not the envelope's HTTP phrase) and that the session survives.
  - **sessions** — Verifies two items with exactly one `[data-test=session-current]` after `loginFromAnotherDevice`; revokes the non-current session and confirms the list drops to one.
  - **address book** — Asserts the seeded single default; adds a second entry without stealing the slot; promotes the new entry then removes the default, confirming the survivor auto-promotes and exactly one default always exists.
  - **email verification** — No banner for a verified seed account; an email change parks as `pendingEmail` (notice shows the new address) while the verified state and absence of the banner are preserved.

## Relationships

- **`tests/support/e2e/scenario.ts`** — `seedAccount('user')` supplies the demo user's password and email, used in the password-change spec and the email-change spec.
- **`tests/support/e2e/harness.ts`** — `loginDevice('user')` creates a second server-side session without touching the current auth cookie, enabling the multi-session and revoke specs.
- **`tests/support/e2e/commands.ts`** — `expectMailTemplate` and `mailedLinkUrl` are imported for email-verification assertions (used in the truncated portion of the spec).

## Notes

- **Index-based input targeting**: `fillAddress` selects fields via `.eq(0)`–`.eq(4)` inside the dialog. Any reordering of inputs in the dialog markup will silently type into the wrong field.
- **Country autocomplete**: The `v-autocomplete` renders only a subset of ~249 ISO 3166-1 entries; the spec types "Italy" to filter rather than scrolling.
- **Deliberate scope boundary**: The token-spends-and-banner-dismisses flow is *not* in this file; it lives in `registration.cy.ts` because it requires an account that never proved its address.
- **`cy.restore()` after `cy.visit('/en')`**: Resets app-level state before visiting the target route; omitting it can leak state between specs.
- **`loginAs` lands on `/en/login`**: The language-persistence test matches the post-login URL with the regex `/\/it(\/|$)/` because the home route is bare `/it` with no trailing slash.
- **Error-message assertion**: The wrong-password spec explicitly negates `'Unprocessable Entity'` to guard against the UI surfacing the HTTP envelope's top-level `message` instead of the field-level `errors[0].message`.
