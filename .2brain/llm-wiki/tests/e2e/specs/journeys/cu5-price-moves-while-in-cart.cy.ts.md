---
source: tests/e2e/specs/journeys/cu5-price-moves-while-in-cart.cy.ts
sha256: 75f98661f49e61681e702f32ebb356c2b628768eef2a0a006d1c49b409a24ae9
generated_at: 2026-10-17T02:13:56.969059+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu5-price-moves-while-in-cart.cy.ts

## Purpose

End-to-end journey test (CU5) verifying that a live cart tracks a product's current price after a repricing, while a confirmed order retains the price frozen at checkout time. It exercises the boundary between "cart is a live view" and "order is a snapshot."

## Key elements

- **`ProductLike`** — minimal `{ price: number }` interface used as the generic type for `cy.apiAs` responses.
- **`unitCents(text)`** — local helper that splits a cart-line string on `×` and converts the left-hand unit-price text to cents.
- **`describe` / `it` block** — single test with four narrative steps:
  1. Customer adds `product.rich` to cart; asserts initial unit price.
  2. Editor PATCHes the product price up (+1200 ¢); customer reloads; cart line and items-total reflect the new price.
  3. Customer selects `pickup` shipping and checks out; asserts the order line unit price equals the raised value.
  4. Editor PATCHes the price down (−800 ¢); customer reloads; the order line *still* shows the raised price, confirmed via a direct API `GET /orders/:id` assertion.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides all shared helpers this file imports: `addToCartFromStorefront`, `cents`, `centsOf`, and `idFromLocation`. The test is written entirely against these abstractions rather than raw `cy.request`/`cy.get` boilerplate.
- **`scripts/e2e/cents.ts`** — source of the `cents` conversion logic that `steps.ts` re-exports; the file's `unitCents` helper depends on the same cent-based arithmetic convention.

## Notes

- `centsOf` is used as a chainable assertion (`.should('equal', n)`), unlike `cents` which is a plain conversion function. Mixing them up will break the assertion chain.
- The `beforeEach` performs `visit → restore → visit` to reset application state; the `restore` step is the mechanism that reseeds fixtures.
- Checkout uses the `pickup` shipping method specifically because it requires no address, which is what un-disables the checkout button in this test's UI.
- The editor role operates exclusively via `cy.apiAs` (background actor); no UI navigation is performed for the editor, keeping the customer as the sole UI subject.
- Prices in the API are decimal dollars (`price: raised / 100`); all assertions in the test are in integer cents.
