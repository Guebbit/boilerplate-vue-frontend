---
source: src/modules/account/tests/e2e/profile.cy.ts
sha256: c6ef6f5976aa47e00dba560afebb2974d3a2abbc38f1b4b86f761dcd3fadf9ca
generated_at: 2026-10-17T00:22:15.055650+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/tests/e2e/profile.cy.ts

## Purpose
End-to-end specs for the signed-in **Profile** self-service surface: language preference, password change, active-session list/revocation, the address book (add / promote / remove default), and email-change behaviour. Runs against the real API in its demo profile so the invariants under test (one default address, a `current` session flag, a `pendingEmail` park) are the backend's own. The specs pin the *page's* honouring of those invariants, not the business rules themselves.

## Key elements
- **`fillAddress(label, street)`** — fills the six inputs in the address dialog and clicks save. Types "Italy" into the `v-autocomplete` country field (≈249 ISO 3166-1 codes, not all rendered) rather than scrolling.
- **`loginFromAnotherDevice()`** — wraps `loginDevice('user')` to create a second *server-side* session without disturbing the page's refresh cookie or the `current` flag.
- **`describe('Profile access')`** — unauthenticated `/profile` redirect (with `continue=` target) and rejection of a fabricated verify-token.
- **`describe('Profile self-service')`** — the bulk of the suite, with sub-describes:
  - *language preference* — save language → page re-renders in Italian **and** the `:locale` URL segment updates; survives a full logout/login cycle.
  - *password change* — happy path (uses `seedAccount('user').password`) and wrong-current-password error path (inline API message, no logout).
  - *sessions* — lists two sessions after a second login; revokes the non-current one.
  - *address book* — seeds exactly one default; add a second, promote it, remove the default → survivor is auto-promoted.
  - *email verification* — no banner for a verified seed; email change parks in `pendingEmail` without un-verifying.

## Relationships
- **`tests/support/e2e/scenario.ts`** — provides `seedAccount('user')` for the known password and email of the demo fixture.
- **`tests/support/e2e/harness.ts`** — provides `loginDevice`, which opens a second session entirely on the server side so the page's own auth cookies stay stable.
- **`tests/support/e2e/commands.ts`** — provides `expectMailTemplate` and `mailedLinkUrl`, imported for mail-outbox assertions (used in the truncated email-verification tail).

## Notes
- **App-level confirm dialog ≠ browser `confirm()`**: Cypress auto-accepts only the browser dialog. Address-removal uses `[data-test=app-dialog-confirm]`; forgetting to click it silently skips the assertion.
- **Country autocomplete**: the full list is virtualised; you must *type* to filter, then click the rendered `.v-list-item` inside `.v-overlay-container`. Scrolling or index-based selection will fail.
- **Error-message source**: the password-change error element must contain the API's `errors[0].message` and must **not** contain the HTTP-level phrase (e.g. "Unprocessable Entity") from the envelope's top-level `message`.
- **Token-spending flow is deliberately absent**: it requires an unverified account, which `registration.cy.ts` owns end-to-end. Do not add it here.
- **Language assertion after re-login**: use `match /\/it(\/|$)/` (not `include '/it/'`) because login lands on `/it` with no trailing segment.
