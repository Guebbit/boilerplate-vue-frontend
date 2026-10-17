---
source: tests/e2e/specs/journeys/cu7-two-shoppers-one-last-unit.cy.ts
sha256: a6d83d546b93965f119565b99d5f2ed382f6e66b0d2f0d257b930eabcee33043
generated_at: 2026-10-17T02:14:32.189086+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu7-two-shoppers-one-last-unit.cy.ts

## Purpose

E2E journey test for scenario **CU7**: two shoppers both hold the last unit of a product in their carts. The first shopper's checkout places a stock hold; the second shopper's cart shows "Sold out" and the checkout button is disabled. After the first shopper cancels the order, the hold is released and the second shopper completes the purchase. The test also verifies that the product page's stock flag transitions in lockstep with the hold/release.

## Key elements

- **`ProductLike`** (interface) — minimal product shape (`available: number`) used for admin API assertions.
- **`expectAvailable(productId, units)`** — queries the product as `admin` via `cy.apiAs` and asserts the `available` count equals `units`. Central helper for every stock-state checkpoint in the test.
- **`describe('CU7 …')` / `it(…)`** — single test case. `beforeEach` visits `/en`, calls `cy.restore()`, then re-visits to reset state. The test body is a linear `cy.then` chain covering: both add to cart → first checks out → both see "Out of stock" → second's checkout is blocked → first cancels → second re-enters and succeeds.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` (adds an item to the cart via the storefront UI) and `idFromLocation` (extracts the order ID from the current URL after checkout).

## Notes

- Stock is asserted two ways: exact numeric count via the admin API (`expectAvailable`) and a text-based page check (`[data-test=product-stock]`). The admin API is the source of truth; the page check validates the revalidation/cache-clearing behavior.
- The second shopper's cart is populated via raw `cy.apiAs('secondShopper', 'POST', '/cart', …)` rather than the UI helper, because adding to cart deliberately bypasses stock checks (documented in the inline comment).
- Checkout uses the **pickup** shipping method so no billing/shipping address is required, which is what enables the checkout button without additional form interaction.
- The seeded second-shopper account (`secondShopper`) exists specifically because staff accounts lack a shopping key; the customer account (`user`) carries the billing address needed for the invoice.
- `cy.subjectId('product.lowStock')` and `cy.subjectProduct(…)` reference a pre-seeded single-unit product; the test assumes exactly 1 unit is available at start.
