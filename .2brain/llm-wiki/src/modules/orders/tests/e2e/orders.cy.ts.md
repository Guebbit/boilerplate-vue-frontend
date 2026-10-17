---
source: src/modules/orders/tests/e2e/orders.cy.ts
sha256: eeeac1794034107aa068b5d5b36f70ce8a3a9396650e9e6f4863dff75e588b5e
generated_at: 2026-10-17T01:17:08.925051+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/orders.cy.ts

## Purpose

Cypress end-to-end spec that exercises the Orders module against the running app. It verifies the orders list rendering, role-gated row actions, CSV export, navigation to order detail, and the order timeline — covering both admin and non-admin customer perspectives.

## Key elements

- **`describe('Orders')`** — Top-level suite. Its `beforeEach` visits `/en` and calls `cy.restore()` to reset seed data before every test.
- **`describe('Orders list')`** (admin) — Verifies page title, row count, status/total text, and the presence of View / Edit / Delete / Hard-delete actions on the `/en/sales/orders` route.
- **`it('offers Hard delete on a cancelled unpaid order only')`** — Uses `cy.subjectId('order.cancelled')` and `cy.subjectId('order.paid')` to fetch seeded IDs, then asserts hard-delete is visible only for the cancelled order.
- **`it('exports the filtered list as a CSV the server answers')`** — Intercepts `GET **/orders/export*`, clicks `[data-test=orders-export]`, and asserts a 200 `text/csv` response with an auth header (JWT or cookie).
- **`it('navigates to order detail when clicking View')`** — Confirms URL contains `/orders/` and `#order-target` is rendered.
- **`describe('Order detail — the timeline')`** — Visits `/en/orders/:id` for a paid order and asserts `[data-test=order-timeline]` exists with at least one `[data-test=order-timeline-entry]` carrying a `data-type` attribute.
- **`describe('Orders list — a non-admin customer')`** — Logs in as `user`, visits `/en/orders` (note: different path from admin), and asserts only `[data-test=row-view]` is present; Edit, Delete, and Hard-delete are absent.

## Relationships

No graph neighbors recorded for this file.

## Notes

- Selectors rely exclusively on `data-test` attributes; no CSS-class or text-only selectors are used for assertions.
- The admin list lives at `/en/sales/orders`; the customer list is at `/en/orders`. Do not conflate the two.
- `cy.subjectId('order.<status>')` is a custom command that resolves a seeded entity ID by status — tests depend on the seed fixture providing at least one cancelled (unpaid) and one paid order.
- The CSV export test tolerates both JWT (`authorization` header) and cookie (`cookie` header) auth, reflecting the app's dual auth modes.
- The non-admin customer block's comment references the per-role visibility pattern mirrored in `src/modules/products/tests/e2e/products.cy.ts`.
- `cy.restore()` runs before every test in the top-level `beforeEach`; tests that call `cy.visit` inside an `it` block rely on this reset to guarantee clean seed data.
