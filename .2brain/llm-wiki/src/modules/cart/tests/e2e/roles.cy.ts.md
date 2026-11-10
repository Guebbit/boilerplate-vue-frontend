---
source: src/modules/cart/tests/e2e/roles.cy.ts
sha256: 25d3c8a1a1227f82f9fc09b7bad4cece75963ca4190373147acd9c2d7c79185f
signature: 25d3c8a1a1227f82f9fc09b7bad4cece75963ca4190373147acd9c2d7c79185f
generated_at: 2026-11-10T04:05:09.788985+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/roles.cy.ts

## Purpose

A Cypress E2E spec that registers the cart route for the shared role-sweep test. It declares which URL and root selector each persona must be able to reach, delegating all traversal and assertion logic to the shared `sweepRoles` helper.

## Key elements

- **`sweepRoles('cart', [...])` call** — The sole executable statement. Passes the module label `'cart'` and a single case descriptor (`route: '/en/cart'`, `pageRoot: '#cart-page'`) to the shared helper. No local functions or exports exist.

## Relationships

- **`tests/support/e2e/role-sweep.ts`** — Imported as `sweepRoles`. This file is purely a case-list registration; all persona iteration, navigation, and assertion logic lives in that helper.

## Notes

- Intentionally co-located with the cart module so that deleting the module also removes its role-sweep case (per the JSDoc).
- The file contains no test logic of its own — it is a one-line declaration. Any behavior changes (selectors, routes, new sub-pages) are made here; any sweep mechanics changes are made in `role-sweep.ts`.
