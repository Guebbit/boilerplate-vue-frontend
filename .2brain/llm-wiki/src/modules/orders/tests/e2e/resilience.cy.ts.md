---
source: src/modules/orders/tests/e2e/resilience.cy.ts
sha256: 37e59d82fdabde6c6111afae2c8aae3673265f458be589d84943986103b8052d
signature: 37e59d82fdabde6c6111afae2c8aae3673265f458be589d84943986103b8052d
generated_at: 2026-11-10T05:02:12.784870+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/resilience.cy.ts

## Purpose

Module-level shard of the shell's resilience sweep for the Orders feature. It verifies that the orders list and individual order pages (for both customer and admin roles) render without unexpected console output and fit the viewport. It deliberately asserts no data values, deferring that responsibility to the central resilience spec.

## Key elements

- **`describe('the orders render whatever the ledger holds')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` (fixture teardown).
- **`it("serves a customer's list and an order quietly and inside the viewport")`** — logs in as `user`, asserts `/en/orders` (anchor `#orders-list-page`) and a paid order detail route (anchor `#order-target`) via `assertRouteIsHealthy`.
- **`it("serves the admin's ledger and an order's edit page quietly and inside the viewport")`** — logs in as `admin`, asserts `/en/sales/orders` (anchor `#orders-list-page`) and a pending order edit route (anchor `#order-edit-page`).
- **`assertRouteIsHealthy`** (imported) — performs the shared "rendered, quiet logs, in-viewport" check against a route and a page anchor selector.

## Relationships

- **`tests/support/e2e/resilience.ts`** — sole import; provides `assertRouteIsHealthy`, which encapsulates the visit, log-capture, and viewport-fit assertions shared across all module shards of the sweep.

## Notes

- The file intentionally **asserts no data values**—only structural health (render, logs, viewport). The rationale is delegated to the central resilience spec referenced in the file header comment.
- Two different route paths cover the same logical list (`/en/orders` vs `/en/sales/orders`) because the customer and admin entry points differ, even though both target the same `#orders-list-page` anchor.
- `cy.subjectId('order.paid')` / `cy.subjectId('order.otherPending')` pull fixture IDs at runtime, so the dynamic route is never hardcoded to a literal value.
