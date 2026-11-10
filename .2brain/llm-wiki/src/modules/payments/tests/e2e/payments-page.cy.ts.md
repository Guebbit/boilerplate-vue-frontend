---
source: src/modules/payments/tests/e2e/payments-page.cy.ts
sha256: 192f93bfb956f91bd03488bddf804360872e7f4700bb6a0150b6aa4d8ab1d15d
signature: 192f93bfb956f91bd03488bddf804360872e7f4700bb6a0150b6aa4d8ab1d15d
generated_at: 2026-11-10T05:14:13.839568+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/payments-page.cy.ts

## Purpose

Cypress E2E suite for the staff payments page (`/en/sales/payments`). It verifies the UI layer—tab rendering, row listing, drawer open/close, status filtering, URL persistence, attention/awaiting tabs, and role-based access—against a live backend. Explicitly does **not** assert payment amounts; those are covered by backend tests.

## Key elements

- **`describe('Payments page')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset seed data.
- **`describe('as an administrator')`** — six `it` blocks exercising:
  - Four tabs exist (All, Awaiting, Refunds, Attention) with "All" visible by default.
  - Payment rows render with a status badge; clicking a row opens the payment drawer (with order link and close button).
  - Filtering by display-status via `cy.pickOption` + submit, then clearing via reset.
  - Tab selection is reflected in the URL query (`tab=refunds`) and survives a reload.
  - Attention tab shows an audit note containing `payment.amount_mismatch`.
  - Awaiting tab lists bank-transfer rows; clicking one opens the same payment drawer.
- **`describe('as a customer')`** — single test: visiting the payments URL as a non-staff user is redirected to `/en` (home page).

## Relationships

No dependency-graph neighbors are recorded for this file. It is a leaf E2E spec; it exercises the running application via the browser rather than importing project modules.

## Notes

- **Custom commands:** `cy.restore()`, `cy.loginAs(role)`, and `cy.pickOption(selector, value)` are project-registered Cypress commands, not part of the standard API.
- **Seed data dependency:** `cy.restore()` in the outer `beforeEach` implies a pre-seeded database; tests assume at least one payment row and at least one awaiting bank transfer exist after restore.
- **Selector convention:** All assertions use `data-test` attributes (or IDs like `#payments-list-page`, `#home-page`) rather than CSS classes or text matching.
- **Timeouts:** Row-level assertions use `{ timeout: 10_000 }` to allow async list loading; tab/content assertions use the default 4 s.
- **Module doc comment** at the top states the design intent (UI-only assertions) and is the authoritative statement of scope.
