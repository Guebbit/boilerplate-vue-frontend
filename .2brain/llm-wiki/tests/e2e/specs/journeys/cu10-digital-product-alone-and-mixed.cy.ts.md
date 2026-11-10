---
source: tests/e2e/specs/journeys/cu10-digital-product-alone-and-mixed.cy.ts
sha256: 9ccaceecdd1fd439cbfbe978a9514ac82f4605c40e1a4d8226841d07e0593754
signature: 9606b618e94c03d5cc962dbb8c297b541ad3b45e5291cb7a3ad2dd2fbc18cd08
generated_at: 2026-11-10T06:54:11.534645+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu10-digital-product-alone-and-mixed.cy.ts

## Purpose

E2E journey test for use-case CU10: a digital product (video course) bought alone and alongside a physical product. Verifies that a digital-only cart skips shipping method/address/delivery cost, still records a billing address, and that adding a physical line restores shipping with "same as shipping" billing. Also confirms a stale shipping selection is silently ignored once the basket goes digital-only, and that the made-to-order physical line carries a no-withdrawal notice while the digital line does not. No payment is performed; assertions stop at the created order.

## Key elements

- **`OrderLike` interface** – Minimal order shape (`shippingCost`, `shippingMethod`, `shippingAddress`, `billingAddress`, `items`) used to type the `cy.apiAs` GET assertion.
- **`describe('CU10 …')`** – Top-level suite; `beforeEach` visits `/en`, calls `cy.restore()` to reset seed data, then re-visits.
- **`it('a course alone ships nothing…')`** – Adds `product.digital` to cart, asserts absence of shipping UI, billing-only address picker, checkout, and that the API-returned order has null shipping fields but a non-null billing street.
- **`it('beside a physical line shipping is back…')`** – Adds `product.noWithdrawal` + `product.digital`, selects standard shipping, asserts free-shipping (basket > 100.00), verifies order charges match cart quote, billing deep-equals shipping, and exactly one no-withdrawal notice.
- **`it('a shipping choice left behind…')`** – Adds both products, picks standard shipping, removes the physical line, then checks out and asserts no shipping fields on the order (stale selection ignored).
- **`addToCartFromStorefront`, `cents`, `centsOf`, `idFromLocation`** – Imported from `../../../support/e2e/steps`; used for cart manipulation, currency helpers, and order-ID extraction from the URL.

## Relationships

- **`tests/support/e2e/steps.ts`** – Direct import source for the four helpers (`addToCartFromStorefront`, `cents`, `centsOf`, `idFromLocation`) that drive cart actions, currency parsing, and URL-based order-ID retrieval.
- **`scripts/e2e/cents.ts`** – Underlying implementation of the `cents()` currency-to-cents conversion, reached indirectly through `steps.ts`; used here to construct the free-shipping threshold value.

## Notes

- `click({ force: true })` is required on the checkout button in the mixed-cart test because the two add-to-cart toast notifications overlap the button; the `not.be.disabled` guard still runs before the forced click.
- The free-shipping threshold is the **whole** basket total (course + physical), not per-line; the test explicitly asserts `items > 100.00` before expecting zero shipping.
- Products referenced by seed slugs: `product.digital` (course, no-withdrawal-exempt) and `product.noWithdrawal` (made-to-order bowl, EU Art. 16(c)). Both must exist in the restored seed.
- The `requires-module` header comment lists six backend modules (account, cart, delivery, inventory, orders, products) that must be active for this spec to pass.
