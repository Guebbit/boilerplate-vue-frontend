---
source: tests/e2e/specs/journeys/fr2-back-button-after-paying.cy.ts
sha256: c6ddf4f722f418f79a80bbf5b306f537e8b9445aaa29c2223c44c9462b933768
signature: 0e2de7e1af0b46c9789e57ccc7c2840177ccaba0424881e9a362802ff804d8b7
generated_at: 2026-11-10T07:06:11.471554+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr2-back-button-after-paying.cy.ts

## Purpose

End-to-end Cypress spec for feature requirement FR2: after a customer completes a card payment, pressing the browser Back button lands on an empty cart, Forward returns to the still-paid order page (with no opportunity to pay again), and a reload leaves everything unchanged. It also asserts via the API that exactly one settled payment exists for the order and the order status is `paid`.

## Key elements

- **`PaymentLike`** – minimal interface (`status: string; amount: string`) used to type the payment object read from the API in the final assertion.
- **`beforeEach`** – visits `/en`, restores fixtures (`cy.restore()`), and clears the user's cart via `DELETE /cart/items` so the test starts with a known-empty cart.
- **`it('leaves an empty cart, a paid order with no second payment, and the same after a reload')`** – the single test case. Flow:
  1. Adds one in-stock product to the cart, selects *pickup* shipping, checks out.
  2. Pays with "Card that pays" and confirms the UI shows `Succeeded` with no re-pay button.
  3. Navigates Back → verifies cart page is empty (no items, no checkout button, no nav badge).
  4. Navigates Forward → verifies order page is still `Succeeded` with no payment method selector.
  5. Reloads → re-verifies the same UI state and, via `cy.apiAs`, confirms the order status is `paid`, the cart is empty, and the order's payment has status `succeeded`.
- **`cy.step(...)`** – human-readable step labels used throughout the test for report readability.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `idFromLocation` (extracts the order ID from the current URL after checkout) and `paymentOfOrder` (fetches the order's payment object as the authenticated user for the API-level assertion).

## Notes

- The leading `// requires-module:` comment declares that this spec depends on the `account`, `cart`, `orders`, `payments`, and `products` modules being available in the test environment.
- The test spends **one** card confirmation against the customer's hourly budget (noted in the file-level doc comment); it is not idempotent in the payment domain and relies on `cy.restore()` in `beforeEach` to reset state.
- `pickup` shipping is chosen deliberately because it requires no address, keeping the checkout path minimal.
- Assertions span both the UI layer (`cy.get(...).should(...)`) and the API layer (`cy.apiAs(...)`) to catch discrepancies between what the browser shows and what the server actually stores.
