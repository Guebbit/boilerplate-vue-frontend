---
source: src/modules/orders/tests/e2e/orders.cy.ts
sha256: e7eac55aa8ae725000776f37d63d914a3cc5e678b5674651d37112fba90272c3
signature: e7eac55aa8ae725000776f37d63d914a3cc5e678b5674651d37112fba90272c3
generated_at: 2026-11-10T05:01:49.211310+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/orders.cy.ts

## Purpose

Cypress end-to-end spec that exercises the real Orders UI: it logs in as different roles, navigates the orders list and order-detail pages, and asserts on rendered rows, role-gated actions, CSV export, the order timeline, and responsive button sizing.

## Key elements

- **`describe('Orders')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset state.
- **`describe('Orders list')`** — admin flow: page title, row count, status/total text, per-row View/Edit/Delete/Hard-delete visibility (Delete only on canceled orders, Hard-delete only on canceled + unpaid), CSV export intercept (asserts auth header + `text/csv`), and View→detail navigation.
- **`describe('Order detail — the timeline')`** — asserts the `[data-test=order-timeline]` container exists, has ≥ 1 entry, and the first entry carries a `data-type` attribute.
- **`describe('Orders list — a non-admin customer')`** — logs in as the seeded `user` account at `/en/orders`; asserts only `[data-test=row-view]` is present (no edit/delete/hard-delete).
- **`describe('Orders list — on a touch screen')`** — calls `applyViewport('tablet')` then `applyViewport('desktop')` and checks that row buttons switch between `v-btn--size-large` and `v-btn--size-small`.

## Relationships

- **`tests/support/e2e/apply-viewport.ts`** — provides the `applyViewport` helper imported at the top of the file. It switches the browser's touch/pointer emulation; it is called only in the touch-screen describe block, and must be invoked before the page is loaded because the pointer state is read at list mount time.

## Notes

- The touch-screen block is intentionally placed **last** in the file: touch emulation leaks into subsequent tests in live Chromium (the desktop pointer is lost), so nothing may follow it.
- `cy.subjectId('order.canceled')` / `cy.subjectId('order.paid')` are custom commands that resolve seeded order IDs by status; they let the test target a specific row without hard-coding IDs.
- The CSV export test accepts either an `authorization` header (JWT mode) or a `cookie` header (session mode) as the auth mechanism.
- The non-admin customer block requires no extra provisioning — the seeded `user` account already owns visible orders (its oldest is soft-deleted), mirroring the per-role visibility pattern in `src/modules/products/tests/e2e/products.cy.ts`.
