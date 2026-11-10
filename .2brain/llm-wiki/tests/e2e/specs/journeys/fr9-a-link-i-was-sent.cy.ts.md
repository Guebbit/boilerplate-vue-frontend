---
source: tests/e2e/specs/journeys/fr9-a-link-i-was-sent.cy.ts
sha256: 2acb6abf0d4f477a411ccaa3d44ae5a59356bca58e50899368bd62c9494b1dcf
signature: 68cf8b599716859f6e1dedf2f55d771a5352dec60490fffee0d54f5a81f15e7d
generated_at: 2026-11-10T07:08:11.522075+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr9-a-link-i-was-sent.cy.ts

## Purpose

End-to-end journey test for FR9 ("I was sent a link, but I'm not logged in"). It verifies that an unauthenticated visitor who opens an order or return link is prompted to log in on that same page, that signing in lands them on the *linked* record (not home), that another customer's order or return surfaces a 404 error page (never a loading spinner or crash), and that a staff-only link bounces a customer to home with a notice while a manager signs in and lands on the edit page.

## Key elements

- **`signIn(role)`** — Internal helper that fills the email/password form on the current page and submits it. If the persona has a `totpSecret`, it calls `answerChallengePage` to complete the staff authenticator step.
- **`describe › "logging in lands on the order…"`** — Verifies the `continue=` query param preserves the target URL, that post-login `pathname` equals the linked order, that the order view renders, and that a stranger's order/return resolves to `/en/error/404/error-page.not-found` with no order/return target in the DOM.
- **`describe › "a staff link sent to a customer turns back…"`** — Opens a `/edit` staff link as a guest, signs in as a customer (lands on `/en` with a `.v-alert`), then restores state, re-opens the same link, and signs in as a manager (lands on the edit path).

## Relationships

- **`tests/support/e2e/login-challenge.ts`** — Provides `answerChallengePage(totpSecret)`, used inside `signIn` to solve the TOTP challenge that appears after a manager submits credentials.

## Notes

- The test relies on several custom Cypress commands (`cy.accountOf`, `cy.subjectId`, `cy.switchUser`, `cy.restore`) that are defined elsewhere in the support layer; their absence here is intentional.
- Security contract under test: the API returns **404**, not 403, for records owned by another customer, so the UI asserts the 404 error page and the absence of any record-specific elements.
- The `continue=` redirect target is URL-encoded in the query string; the test decodes it with `decodeURIComponent` before asserting.
- The `signIn` helper is defined at module scope but is only called in the second `it` block; the first block inlines the same form-filling steps (slightly duplicated) to keep the "guest" path free of TOTP branching.
