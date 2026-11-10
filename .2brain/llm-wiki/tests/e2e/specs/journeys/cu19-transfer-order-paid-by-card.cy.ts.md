---
source: tests/e2e/specs/journeys/cu19-transfer-order-paid-by-card.cy.ts
sha256: 614d5bd876d2c773aa5aa169a2868565387b13cbeb1757a8945bccc22d0d44dd
signature: 4877b8e5c6518e17fc45eda24eae8c06b25bd9aaf3e074b8dc0e5a03d1379efe
generated_at: 2026-11-10T06:56:18.594552+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu19-transfer-order-paid-by-card.cy.ts

## Purpose

End-to-end (Cypress) test for use case **CU19**: a customer begins checkout with bank-transfer payment, sees the transfer instructions, then pays the *same* order by card. The test verifies that the order state is internally consistent after the switch (payment method reads "Card", not "Bank transfer"), the transfer panel disappears, an invoice appears, the admin can locate the paid order by the RF reference, and no offline payment form is offered.

## Key elements

- **`OrderLike`** (interface) – the minimal order slice the test asserts on via the API (`status`, `paymentMethod`).
- **`describe('CU19 …')`** – single test suite; `beforeEach` visits `/en`, restores the DB, and revisits.
- **Single `it('pays a transfer order by card …')`** – the full journey, sequenced with `cy.step()` into four logical phases:
  1. Checkout by bank transfer (uses `pickup` shipping to skip address entry).
  2. Card payment offered beside the transfer panel; customer pays with "Card that pays".
  3. Post-payment assertions on the DOM *and* a direct API call (`cy.apiAs<OrderLike>`) confirming `status: "paid"` and `paymentMethod: "card"`.
  4. Admin searches by the RF reference, lands on the edit page, and confirms the offline-payment form is absent.

## Relationships

- **`tests/support/e2e/steps.ts`** – supplies `addToCartFromStorefront` to place an item in the cart, and `idFromLocation()` to extract the order ID from the URL after checkout. No other external modules are imported; all remaining interactions go through `cy.*` commands and `data-test` selectors.

## Notes

- The `requires-module` header comment lists backend modules that must be running: `account, cart, delivery, inventory, orders, payments, products`.
- The RF reference is read from `[data-test=transfer-reference]` text and whitespace-stripped with `.replaceAll(/\s+/g, '')` before being used in the admin search.
- The test asserts on **both** the rendered DOM and the API response for the payment method, guarding against a UI/API mismatch.
- `cy.switchUser('admin')` is used to move from the customer session to the admin session within the same test.
- The offline-payment form absence is checked on the edit page; the test then re-visits the customer-facing order page to re-confirm the "Card" method is still displayed.
