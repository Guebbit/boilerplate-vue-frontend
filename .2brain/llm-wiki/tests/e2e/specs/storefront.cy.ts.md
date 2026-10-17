---
source: tests/e2e/specs/storefront.cy.ts
sha256: 76503be5b967f7013f5eab98a56025c92f39bfa45fbef52a140b505ae3a9f4bb
generated_at: 2026-10-17T02:23:40.984230+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/storefront.cy.ts

## Purpose

Cypress end-to-end spec for the customer-facing storefront surface: catalogue facet chips, product-page stock gating, and order-page cancel/buy-again actions. It pins that the pages honour invariants the API already enforces (public-scope facet counts, the stock gate, the single buyer-driven order write).

## Key elements

- **`describe('Storefront')`** — top-level block; `beforeEach` visits `/en` and calls `cy.restore()` to reset seed state.
- **`describe('catalogue facets')`** — asserts facet chips render with counts *derived* from `cy.publicProducts()` (not hardcoded) and that clicking a chip filters the product grid to that count.
- **`describe('product page')`** — logs in as `user`, loads a subject product (`product.outOfStock`) via `cy.subjectId()`, and asserts the add-to-cart button is disabled with an "Out of stock" message.
- **`describe('order actions')`** — cancels a seeded `order.awaitingTransfer` via the in-app confirm dialog, verifies the cancel button disappears (status-driven gate), then clicks "reorder" and asserts the previously empty cart now contains the ordered product line.

## Relationships

No graph-neighbor files are recorded for this spec. It depends at runtime on the `cart`, `orders`, and `products` modules (declared in the `requires-module` comment) and on the shared Cypress custom commands (`cy.publicProducts`, `cy.subjectId`, `cy.subjectOrder`, `cy.loginAs`, `cy.apiAs`, `cy.restore`).

## Notes

- **Derived-count assertion:** facet counts are computed from the live public product list inside the test, so the expectation moves with the dataset rather than pinning one backend's catalogue. A chip showing a count higher than the guest can see is the leak being caught.
- **Cart emptied before reorder:** `cy.apiAs('user', 'DELETE', '/cart/all')` runs first so the only line that can appear after "reorder" is the one the reorder action inserted.
- **Cypress command-queue caveat:** `productTitle` is captured inside a `.then()` callback and read in a *later* `cy.then(() => …)` rather than referenced synchronously; this is required because Cypress queues commands and does not await them in place.
- **In-app confirm dialog:** the cancel flow clicks `[data-test=app-dialog-confirm]` specifically; Cypress auto-accepts only the native `window.confirm`, not the app's own dialog component.
- **Wishlist is out of scope here:** it lives in `src/modules/wishlist/tests/e2e/wishlist.cy.ts` alongside its module.
