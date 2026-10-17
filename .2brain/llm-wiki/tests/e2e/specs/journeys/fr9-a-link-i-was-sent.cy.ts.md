---
source: tests/e2e/specs/journeys/fr9-a-link-i-was-sent.cy.ts
sha256: d95e51aa36492ea153d10d50f94affd11a13dc1a236e185c45afeb1d442f874b
generated_at: 2026-10-17T02:16:53.066315+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr9-a-link-i-was-sent.cy.ts

## Purpose

E2E test for FR9: a guest who opens an order (or return) link from a mail without an active session must be redirected to login *on that same page*, logged in, and land on the exact linked record—not the home page. It also verifies that a record belonging to a different customer surfaces a 404 error page (never a stuck loading state or crash), so the visitor gains no information about whether the record exists.

## Key elements

- **`describe('FR9 · I was sent a link, but I am not logged in')`** — single test suite; `beforeEach` resets to `/en` and calls `cy.restore()` to clean fixtures.
- **`it('logging in lands on the order…')`** — one test covering three scenarios:
  1. *Guest → login with `continue=` redirect*: visits `/en/orders/{orderId}`, asserts `#login-page` exists and the query string encodes the original order path.
  2. *Login lands on the linked order*: fills email/password from `cy.accountOf('user')`, submits the form, asserts `pathname` is the order URL, `#order-target` and `[data-test=order-number]` are present, and `#home-page` is absent.
  3. *Stranger's order / return → 404*: switches to a different user's `order.otherPending` and `return.requested` fixtures; asserts `#error-page` exists, `pathname` is `/en/error/404/error-page.not-found`, and the domain-specific target (`#order-target` / `#return-target`) is absent.
- **Custom Cypress commands used**: `cy.subjectId(fix)` (resolve a fixture ID), `cy.step(label)` (annotate), `cy.accountOf(role)` (get credentials), `cy.switchUser(role)` (change session context), `cy.restore()` (reset DB).

## Relationships

No graph neighbors are recorded for this file. It depends only on the application under test and the shared Cypress support layer (custom commands, fixtures).

## Notes

- The `// requires-module: account, orders, returns` comment is a build/test dependency hint; the spec will fail if any of those feature modules is absent from the build.
- The 404-vs-403 distinction is intentional and documented in the header: the API returns **404** (not 403) for cross-tenant records to avoid leaking existence. The test asserts the 404 path specifically.
- `cy.switchUser('editor')` is called *after* the order-404 check and *before* the return-404 check; this changes the session context mid-test. Do not reorder the steps without understanding the fixture ownership.
- The `continue=` assertion decodes the full query string and checks it contains the absolute order path (`/en/orders/…`), not just an ID fragment.
- Single `it` block containing three sequential `cy.step` sections; a failure in step 1 aborts the 404 checks. Splitting into separate tests is possible but not the current convention for this file.
