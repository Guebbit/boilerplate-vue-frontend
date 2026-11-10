---
source: src/modules/account/tests/e2e/profile.cy.ts
sha256: 5cd02cf26df753ae7f39978880850215e35a7fc4ef4b25c8ac374a1d3475bfad
signature: f3c89cb97f07490a3450b939934fafcb9ad9809aeb689f90d11d037aa9d17651
generated_at: 2026-11-10T03:33:47.895569+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/profile.cy.ts

## Purpose

Cypress e2e specs for the self-service profile page (password change, active sessions, address book, email verification). They run against the real API in its demo profile so the invariants under test (one default address, a single `current` session flag, email change parked as `pendingEmail`) are the backend's own. The tests pin the *page honouring* those invariants, not the rules themselves.

## Key elements

- **`fillAddress(label, street)`** – Fills the six inputs in the address dialog (including the `v-autocomplete` country field, typed to "Italy") and clicks save. Positional `cy.get('input').eq(N)` indexing, not labels.
- **`loginFromAnotherDevice()`** – Wraps `loginDevice('user')` from the harness to create a second real session server-side, so the page's own refresh cookie and `current` flag stay untouched.
- **`describe('Profile access')`** – Guest-only cases: redirect to login with `continue=` remembered; rejection of a token the API never issued (stays on page, no success toast).
- **`describe('Profile self-service')`** – Authenticated suite (shared `beforeEach` restores + `cy.loginAs('user')` + visits `/en/profile`):
  - **language preference** – Switching to Italian updates the URL segment and persists across logout/re-login.
  - **password change** – Happy path uses `seedAccount('user').password` for current; wrong-password case asserts an inline error (not a toast, not a logout, not the HTTP envelope's top-level message).
  - **sessions** – Two sessions listed with exactly one `[data-test=session-current]`; revoking the other leaves one.
  - **address book** – Seeded default present; adding preserves the single-default invariant; promoting moves the slot; removing the default auto-promotes the survivor.
  - **email verification** – Verified seed shows no banner; an email change parks as `pendingEmail` (no banner, pending-notice names the new address); confirming the mailed link swaps the active email (truncated in view).

## Relationships

- **`tests/support/e2e/scenario.ts`** – `seedAccount('user')` supplies the seeded password and email used in assertions and input.
- **`tests/support/e2e/harness.ts`** – `loginDevice` creates the second server-side session without a browser login, preserving the page's refresh-cookie state.
- **`tests/support/e2e/commands.ts`** – `expectMailTemplate` and `mailedLinkUrl` drive the email-verification flow (extracting the token URL from the API outbox and asserting on the template).

## Notes

- The country selector is a `v-autocomplete` with ~249 ISO 3166-1 codes; the list is virtualised, so the test **types** to filter rather than scrolling.
- `fillAddress` identifies inputs by ordinal index (`eq(0)`–`eq(4)`) inside `[data-test=address-dialog]`, not by `name` or `label` — fragile if field order changes.
- The app renders its own confirmation dialog (`[data-test=app-dialog-confirm]`); Cypress auto-accepts only the browser's native `confirm()`, so this one must be clicked explicitly.
- The "unverified account shows banner until token is spent" arc is **deliberately absent** here — it belongs in `registration.cy.ts`, which owns the signup that creates that state.
- The file targets the demo profile exclusively; credentials and seed data come from `seedAccount`, so tests are self-contained but coupled to that fixture's shape.
