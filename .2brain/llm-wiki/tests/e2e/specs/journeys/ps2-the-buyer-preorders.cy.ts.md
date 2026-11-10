---
source: tests/e2e/specs/journeys/ps2-the-buyer-preorders.cy.ts
sha256: 5960832e28a73233ffc8d449ef68ed3f99d1abfc5e719093e77d105378390655
signature: 945b663f10168b2cd351454bf1444b80fe822c66dd915a8414661f13fc388bb3
generated_at: 2026-11-10T07:20:36.990569+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/ps2-the-buyer-preorders.cy.ts

## Purpose

Cypress E2E spec covering the buyer's preorder journey (journey PS2). It verifies that a product with a future release date and an open preorder allowance is surfaced as "Preorder" on the product page, cart line, and placed order (with a ship-from date), and that once the allowance is fully consumed the product reads "Out of stock" to subsequent shoppers.

## Key elements

- **`unique()`** – generates a per-run identifier (`Date.now()` + random suffix) so parallel specs on one backend don't collide.
- **`OrderLike`** (interface) – the minimal order shape this spec asserts against (`id`, `items[].product.preorder`).
- **`describe('PS2 · The buyer preorders')`** – the top-level suite; `beforeEach` visits `/en`, calls `cy.restore()`, then re-visits to start from a clean session.
- **Test 1 – "is offered Preorder, sees it in the cart and reads the date on the order"** – editor creates a product with a release date 60 days out, admin opens a `backorderLimit` of 5 via `PATCH /inventory/levels/{id}`, then a `user` confirms the "Preorder" button, cart-line label, checkout, and the order's "ships from" text.
- **Test 2 – "tells the next shopper 'Out of stock' once the allowance is taken"** – uses the `preorderOnSale` helper (limit 1), the first shopper buys and pays via API, then a `support`-level user sees a disabled "Out of stock" button.

## Relationships

- **`tests/support/e2e/steps.ts`** – source of all step-level helpers this spec imports: `checkoutAs`, `createProductThroughTheForm`, `preorderOnSale`, `releaseDateIn`, and `addOpenProductToCart`. Every multi-step UI or API interaction (product creation, adding to cart, checkout, payment) is delegated to that module.

## Notes

- The file header declares `requires-module: account, cart, inventory, orders, products` — the test backend must have all five services running.
- The module doc-comment states the spec was written against live pages but **not yet executed in a browser**; first-run selector adjustments may be needed.
- `cy.restore()` in `beforeEach` is the shared fixture-reset mechanism (defined in `steps.ts`); it is expected to roll back all data created by previous tests.
- Auth is handled via `cy.loginAs` / `cy.switchUser` / `cy.apiAs` (also from `steps.ts`), not by raw cookie injection.
- Data-testid selectors (`data-test=add-to-cart`, `data-test=cart-line-availability`, `data-test=order-item-preorder`, `data-test=product-release-date`) are the contract with the UI layer; if they change, this spec breaks.
