---
source: src/modules/orders/tests/e2e/resilience.cy.ts
sha256: a609bf97f053d40e99c0e9a38647e7d06f720abd01c1a2e3e3ffba136eb4f004
generated_at: 2026-10-02T15:21:44.296166+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/resilience.cy.ts

## Purpose

Contributes the orders module's pages to the project-wide resilience sweep. Verifies that the customer's order list, a single paid order, the admin's ledger, and an order edit page all render without unexpected console output and within the viewport. It is one slice of the central resilience spec (`tests/e2e/specs/resilience.cy.ts`).

## Key elements

- **`describe('the orders render whatever the ledger holds')`** – Top-level suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset application state between tests.
- **Customer test** (`serves a customer's list…`) – Logs in as `user`, asserts `/en/orders` is healthy (target `#orders-list-page`), then resolves a `order.paid` fixture ID via `cy.subjectId()` and asserts `/en/orders/{id}` (target `#order-target`).
- **Admin test** (`serves the admin's ledger…`) – Logs in as `admin`, asserts the same list page, then resolves a `order.ownerPending` fixture ID and asserts `/en/orders/{id}/edit` (target `#order-edit-page`).
- **`assertRouteIsHealthy(url, targetSelector)`** – Imported from the shared resilience helper; performs the actual render/no-log/viewport assertions.

## Relationships

- **`tests/support/e2e/resilience.ts`** – Sole import target. Supplies `assertRouteIsHealthy`, which encapsulates the visit, console-error check, and viewport-fit logic shared across all module resilience tests.
- **`tests/e2e/specs/resilience.cy.ts`** (referenced in the header comment) – The central "shell" resilience sweep that this file is a module-specific companion to.

## Notes

- The header comment explicitly states the file "names no value" and defers the justification to the central file. Do not add value-specific assertions here; that scope belongs to feature tests.
- Customer and admin tests use **different fixture states** (`order.paid` vs. `order.ownerPending`) and **different detail routes** (read-only page vs. edit page). Adding a new page that one role can reach requires a corresponding `assertRouteIsHealthy` call in the matching `it` block.
- `cy.subjectId()` is a project custom command that resolves a named fixture to a concrete ID at runtime; the test does not hard-code any order identifier.
