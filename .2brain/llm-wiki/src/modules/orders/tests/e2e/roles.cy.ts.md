---
source: src/modules/orders/tests/e2e/roles.cy.ts
sha256: c99ff0829a651c2ae9b64c47e2cff9318726ff7d3869077a9aeb5122e221a54f
signature: c99ff0829a651c2ae9b64c47e2cff9318726ff7d3869077a9aeb5122e221a54f
generated_at: 2026-11-10T05:02:21.911767+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/e2e/roles.cy.ts

## Purpose

Declares the role-based access-control expectations for the staff order pages (list and edit). For each defined page and button, the browser must enforce the same permission rules the data model prescribes. The file exists as a declarative case list co-located with the orders module so that removing the module automatically removes its sweep.

## Key elements

- **`sweepRoles('orders', …)` call** — single invocation passing a two-entry configuration array to the shared helper.
- **`staff orders list` entry** — defines route `/en/sales/orders`, required permission `['display','Order']`, a menu link, a page root (`#orders-list-page`), and three buttons each with its own `can` pair (export Order, create Payment, update Order).
- **`order edit` entry** — defines a *dynamic* route built at runtime via `cy.subjectId('order.paid')`, requires `['update','Order']`, targets `#order-edit-page`, and declares no individual buttons (only the page-level permission is checked).

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — provides the `sweepRoles` function that iterates over every persona in the system, navigates each declared route, and asserts visibility/enabled-state of the page root and listed buttons against the `can` permissions. This file supplies the data; the helper performs the actual sweep.

## Notes

- The `order edit` route is a **function**, not a string — it resolves a real paid-order ID through `cy.subjectId` at test time. Any other static route in the array is a plain string; the helper must handle both shapes.
- The `can` arrays use a `[verb, noun]` convention (e.g. `['export','Order']`) that maps to the application's permission vocabulary; the helper interprets them, this file only declares them.
- Co-location is intentional: the file lives under `src/modules/orders/` rather than in a central test directory, so deleting the orders module removes its role tests with it.
