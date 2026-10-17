---
source: src/modules/payments/tests/e2e/payments-page.cy.ts
sha256: 206a019c2351152efac331ce5c5926611955b90a8f21bf8750c7511b420034b8
generated_at: 2026-10-17T01:24:26.819174+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/payments-page.cy.ts

## Purpose

Cypress end-to-end test for the staff payments page (`/en/sales/payments`). It verifies the page-level concerns—tab layout, row/drawer interaction, status filtering, URL persistence, and role-based access—against the real backend. Numeric correctness of payment data is intentionally left to backend tests.

## Key elements

- **`describe('Payments page')`** – top-level suite; calls `cy.visit('/en')` then `cy.restore()` (seed/restore fixture) before each test.
- **`describe('as an administrator')`** – logs in as `admin`, navigates to the payments page, and asserts the `#payments-list-page` root exists. Contains six `it` blocks:
  - Four tabs render (All, Awaiting, Refunds, Attention) with All visible by default.
  - At least one `payment-row` exists; clicking it opens `payment-drawer` with an order link; closing hides the drawer.
  - Filtering by display status ("Succeeded") narrows rows; reset restores the full list.
  - Clicking the Refunds tab updates the URL (`tab=refunds`) and survives a page reload.
  - The Attention tab shows an audit note containing `payment.amount_mismatch`.
  - The Awaiting tab lists bank transfers with at least one `awaiting-record` action.
- **`describe('as a customer')`** – logs in as `user`, visits the payments URL, and asserts a redirect to `/en` (home page) with the `#home-page` root visible.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- `cy.restore()` is called in the outer `beforeEach` and is assumed to seed or reset the backend fixture state; every test depends on it running first.
- `cy.loginAs()` is a custom command (not part of the Cypress API) that handles authentication with a named role (`'admin'` / `'user'`).
- The 10-second timeout on `payment-row` assertions accounts for backend response latency; without it, rows may not yet be rendered.
- The test explicitly does **not** assert specific monetary values—those are covered by backend unit/integration tests.
- The customer-access test navigates directly to the payments URL and checks the redirect target, rather than simulating a 403 page.
