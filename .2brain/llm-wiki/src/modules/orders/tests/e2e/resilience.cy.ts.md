---
source: src/modules/orders/tests/e2e/resilience.cy.ts
sha256: 37e59d82fdabde6c6111afae2c8aae3673265f458be589d84943986103b8052d
generated_at: 2026-10-17T01:17:24.984342+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/resilience.cy.ts

## Purpose

The orders module's contribution to the project-wide resilience sweep. It verifies that the order list and a single order page render without unexpected console output and fit the viewport, covering both the customer's view and the admin's ledger. It intentionally asserts no data values—only structural health (render, silence, viewport).

## Key elements

- **`describe('the orders render whatever the ledger holds')`** — top-level suite; calls `cy.restore()` in `beforeEach` after visiting `/en`.
- **Customer test** — logs in as `'user'`, then asserts `/en/orders` (`#orders-list-page`) and a concrete paid-order route `/en/orders/{id}` (`#order-target`) via `assertRouteIsHealthy`. The order id is resolved with `cy.subjectId('order.paid')`.
- **Admin test** — logs in as `'admin'`, then asserts `/en/sales/orders` (`#orders-list-page`) and the edit page `/en/orders/{id}/edit` (`#order-edit-page`). The order id is resolved with `cy.subjectId('order.otherPending')`.
- **`assertRouteIsHealthy`** (imported) — the single assertion primitive that checks rendering, console silence, and viewport fit for a given route + expected element.

## Relationships

- **`tests/support/e2e/resilience.ts`** — provides `assertRouteIsHealthy`, the shared helper this file delegates all assertions to. This file is the orders-specific consumer of that contract.
- The file header references **`tests/e2e/specs/resilience.cy.ts`** as the "shell" / central sweep that this module-level file feeds into (no direct import; the relationship is organizational).

## Notes

- This file is one of several per-module resilience specs; it does **not** import or depend on the other module specs. The "sweep" is a convention, not a runtime dependency.
- It never asserts field values or counts—only that the named page element exists, the console is quiet, and the layout fits the viewport. Adding value assertions here would diverge from the resilience contract.
- `cy.subjectId` is expected to return a deterministic id from the test database; the two tests pick different subjects (`order.paid`, `order.otherPending`) to exercise different page states.
