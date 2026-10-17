---
source: tests/e2e/specs/journeys/fr2-back-button-after-paying.cy.ts
sha256: 5a1249ec47b0193df3fca9def42c244fd6cf945a7ea44307dcdf6e0e4093f176
generated_at: 2026-10-17T02:16:08.213475+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr2-back-button-after-paying.cy.ts

## Purpose

End-to-end journey test for FR2: after a customer checks out and pays by card, pressing browser **Back → Forward → Reload** must not resurrect the consumed cart. The test asserts the cart page is empty, the order page still shows a succeeded payment with no re-payment affordance, and the API confirms exactly one settled payment and an empty cart.

## Key elements

- **`PaymentLike`** (local interface) — minimal shape `{ status: string; amount: number }` used to type the single payment the test fetches via API.
- **`beforeEach`** — visits `/en`, runs `cy.restore()`, then issues `DELETE /cart/all` as the user so the test's own single cart line is unambiguous.
- **Single `it` block** — drives the full journey:
  - Adds one `product.inStock` to the cart, selects `pickup` shipping, clicks checkout.
  - Calls `cy.payWith('Card that pays')` and asserts `payment-status` = "Succeeded" and no `payment-submit` button.
  - Extracts `orderId` with `idFromLocation()`, then performs `cy.go('back')`, `cy.go('forward')`, and `cy.reload()` in sequence, asserting UI and API invariants after each step.
- **Custom commands used** — `cy.loginAs`, `cy.subjectId`, `cy.apiAs`, `cy.goToCart`, `cy.payWith`, `cy.step` (all defined elsewhere in the support layer).

## Relationships

- **`tests/support/e2e/steps.ts`** — provides `idFromLocation`, which parses the current URL to extract the order ID after the checkout redirect. This is the only direct import from that file.

## Notes

- The `requires-module` header comment (`account, cart, orders, payments, products`) is a convention for tooling that gates which backend modules must be running before this spec executes.
- Shipping is set to `pickup` deliberately so no address form is required; switching to a delivery method would change the checkout flow.
- The test is state-sensitive: it relies on the browser's navigation stack being clean (one `Back` takes you to the cart, one `Forward` returns to the order). Extra navigations or SPA route animations could break the assertions.
- `PaymentLike` is defined locally rather than imported from a shared types file; if the payment API shape changes, only this file's assertion needs updating.
