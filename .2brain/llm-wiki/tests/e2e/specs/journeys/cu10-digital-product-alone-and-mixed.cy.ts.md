---
source: tests/e2e/specs/journeys/cu10-digital-product-alone-and-mixed.cy.ts
sha256: c32559f5f68728d4693fda0f5dba286454f83a0868ca6ef0c11858a8a397c9d4
generated_at: 2026-10-17T02:09:19.288640+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu10-digital-product-alone-and-mixed.cy.ts

## Purpose

Cypress journey test (CU10) that verifies checkout behaviour for a digital product (video course) in two configurations — alone and alongside a physical made-to-order item — and for a stale shipping selection that survives removal of the last physical line. It asserts that a digital-only cart skips the shipping step entirely, that a mixed cart restores shipping with the whole basket counted toward the free-shipping threshold, and that a leftover shipping choice is silently ignored rather than rejected.

## Key elements

- **`OrderLike`** — local interface describing the slice of the order object the tests read back via API (`shippingCost`, `shippingMethod`, `shippingAddress`, `billingAddress`, `items`).
- **`it('a course alone ships nothing…')`** — adds only `product.digital`, asserts the cart shows no shipping selector / address picker / shipping cost, confirms the billing address picker is present (no "same as" option), then checks the created order has `shippingMethod: null`, `shippingCost: 0`, no `shippingAddress`, but a populated `billingAddress.street`.
- **`it('beside a physical line shipping is back…')`** — adds `product.noWithdrawal` + `product.digital`, selects standard shipping, verifies the "same as shipping" billing default is checked, confirms the combined item total exceeds the free-shipping threshold (100.00), asserts the order's shipping cost matches the cart quote (0), and that the no-withdrawal notice appears only on the bowl.
- **`it('a shipping choice left behind…')`** — selects standard shipping for a mixed cart, removes the physical line, checks out, and verifies the order carries no shipping method or address (the stale choice is ignored, not an error).
- **`beforeEach`** — visits `/en`, calls `cy.restore()` (seed reset), re-visits.

## Relationships

- **`tests/support/e2e/steps.ts`** — provides the four helpers used throughout: `addToCartFromStorefront` (adds a product by slug), `cents` / `centsOf` (currency parsing helpers), and `idFromLocation` (extracts the order ID from the URL after checkout).
- **`scripts/e2e/cents.ts`** — upstream source of the `cents`/`centsOf` utilities; reached indirectly through the re-export in `steps.ts`.

## Notes

- The physical fixture is `product.noWithdrawal` (EU Art. 16(c) made-to-order), chosen specifically to also assert that the no-withdrawal notice attaches only to the physical line.
- `click({ force: true })` is used on the checkout button because lingering add-to-cart toasts overlap the button's hit area; the `should('not.be.disabled')` guard still runs first.
- The free-shipping threshold is 100.00 (bowl 80 + course 29 = 109), so the mixed cart qualifies for free standard shipping.
- The test intentionally stops at order creation; no payment step is exercised.
- The "same as shipping" billing default is asserted as the *checked* radio in the mixed case and as *absent* (not offered) in the digital-only case.
