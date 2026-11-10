---
source: tests/e2e/specs/storefront.cy.ts
sha256: 8d07096b0f309b5318fdfa0339f0ade908144f50a90fbd615fef9f2061c72664
signature: 8d07096b0f309b5318fdfa0339f0ade908144f50a90fbd615fef9f2061c72664
generated_at: 2026-11-10T07:24:44.643401+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/storefront.cy.ts

## Purpose

E2E spec for the storefront surface shipped in the customer release: facet chips on the product listing, stock display and add-to-cart gating on the product page, and the order page's cancel and buy-again actions. It verifies the UI honours invariants the API already enforces (public-scope facet counts, the stock gate, the single order write path).

## Key elements

- **`describe('Storefront')`** — top-level suite; `beforeEach` visits `/en` and calls `cy.restore()`.
- **`describe('catalogue facets')`** — single test that derives expected category counts from `cy.publicProducts()` at runtime (not hardcoded), asserts a chip shows the correct label, clicks it, and verifies the visible product-card count matches.
- **`describe('product page')`** — logs in as a seeded user, navigates to the `product.outOfStock` subject, asserts the add-to-cart button is disabled and an "Out of stock" message is present.
- **`describe('order actions')`** — logs in as the buyer, empties the cart via `cy.apiAs('user', 'DELETE', '/cart/items')`, navigates to the `order.awaitingTransfer` subject, clicks cancel (confirming via `data-test=app-dialog-confirm`), asserts the cancel button disappears, then clicks reorder and asserts the previously-emptied cart now contains the product.

## Relationships

No graph neighbors are registered for this file. The spec depends at runtime on custom Cypress commands (`cy.publicProducts`, `cy.loginAs`, `cy.subjectId`, `cy.apiAs`, `cy.subjectOrder`, `cy.restore`) and on the `cart`, `orders`, and `products` modules (per the `requires-module` comment), but none of those appear as dependency-graph edges.

## Notes

- **`productTitle` capture pattern.** The variable is declared with `let` outside a `.then()`, assigned inside it, and read inside a *later* `.then()`. This works because Cypress queues commands; the second `.then()` executes after the first resolves. Reading it synchronously in the outer scope would always yield the initial empty string.
- **App dialog vs. browser dialog.** The cancel flow confirms via `[data-test=app-dialog-confirm]`. Cypress auto-accepts `window.confirm` (the browser dialog) but *not* in-app modal dialogs, so the test must click the app-level button explicitly.
- **Cart emptied via API before reorder.** The seeded cart already contains other line items; `DELETE /cart/items` ensures the only item present after "buy again" is the one the reorder action placed there, making the assertion unambiguous.
- **Facet counts are derived, not pinned.** The test computes expected counts from the live public product list rather than hardcoding a number, so it stays correct across datasets and fails on scope leaks (e.g., a chip showing a count that includes products the guest cannot see).
- **Wishlist tests live elsewhere.** By explicit comment, wishlist E2E coverage is in `src/modules/wishlist/tests/e2e/wishlist.cy.ts` rather than here.
