---
source: tests/e2e/specs/journeys/ps3-the-board-from-allowance-to-allocation.cy.ts
sha256: 420a77f6111e3d2df6fa0a5f7fa39436cfbf21d487848beb7fafda51512ba5a2
signature: 7d9ce692e40471c8e135424fd68359388b811a160481d97cd3bb9f6d80f6b44e
generated_at: 2026-11-10T07:20:48.429118+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps3-the-board-from-allowance-to-allocation.cy.ts

## Purpose

End-to-end Cypress test for the PS3 journey: verifying the full preorder lifecycle from the warehouse setting a backorder allowance, through a customer placing and paying two preorders, to the admin seeing them on the preorder board, stock receipt allocating both orders, and the warehouse shipping one. Exists to guard the cross-module interaction between inventory, orders, and the admin preorder board.

## Key elements

- **`LevelLike`** (interface) — minimal shape of a stock-level entry (`productId`, `backorderLimit`) used to type the API response.
- **`limitOf(productId)`** — helper that calls `GET /inventory/levels?pageSize=100` as admin, finds the matching level, and returns its `backorderLimit` as a `Cypress.Chainable<number | undefined>`. Used to assert the allowance value after each UI interaction.
- **`describe('PS3 · …')` / `it('takes an allowance, shows two waiting orders, and allocates a receipt to both')`** — single test case containing all steps: allowance dialog (cancel / negative clamp / save), two paid preorders, board outstanding count, order-card "awaiting stock" state with no shipped option, receipt allocation, and a single ship.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports three step helpers used inside the test:
  - `preorderOnSale` — creates a preorder product (with `releaseInDays`, `limit`, `title`) and returns the product ID.
  - `paidPreorderBy` — places and pays a single preorder for the given product.
  - `shipThroughTheApi` — ships an order via the API.

## Notes

- Requires the following modules to be loaded: `account`, `cart`, `delivery`, `inventory`, `orders`, `payments`, `products` (declared via the `requires-module` comment).
- `beforeEach` calls `cy.restore()` between visits to reset seeded data; the test is a single `it` block, so all steps run in one transaction.
- The negative-input clamp (`-1` → `0`) is a UI-side guard; the test asserts the input value, not a server-side rule.
- The "no shipped option" assertion inspects the override-status dropdown options and asserts the joined labels do not match `/shipped|delivered/i` — a soft check that relies on exact label wording.
- The receipt-allocation step uses a raw `POST /inventory/levels/:id/receive` API call (not a UI flow), then verifies via the movements log and the order page.
