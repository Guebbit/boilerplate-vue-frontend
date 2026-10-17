---
source: tests/e2e/specs/journeys/cu3-bank-transfer.cy.ts
sha256: de8b81318e0ca16c05ce1af94820342aae6356bea71bb23555c851335884a5f5
generated_at: 2026-10-17T02:13:14.006784+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu3-bank-transfer.cy.ts

## Purpose

End-to-end Cypress spec (tagged `@smoke`) that walks the full bank-transfer payment journey from both sides: the customer checks out with a bank-transfer payment method and reads the IBAN / reference / deadline instructions; the admin locates the order by that reference in the sales UI and records the offline payment; the customer reloads the order and sees it as paid. The central concern is that the *reference* is the single shared handle across all three screens (checkout panel, admin search, order-confirmation e-mail).

## Key elements

- **`BANK_REFERENCE`** (`'E2E-CU3-0001'`) – the identifier the admin types into the "record offline payment" form; deliberately distinct from the customer-facing transfer reference.
- **`shownWithoutSpaces(selector)`** – local helper that reads a `data-test` element's text and strips all whitespace; used to compare clipboard contents against the on-screen IBAN / reference.
- **`describe('CU3 · Bank transfer, both sides')`** – single `it` block tagged `@smoke`; requires the modules `account, cart, delivery, inventory, orders, payments, products` (see `requires-module` comment).
- **`beforeEach`** – visits `/en`, calls `cy.restore()` to reset seed data, then re-visits.

## Relationships

- **`tests/support/e2e/steps.ts`** – provides `addToCartFromStorefront` (adds `product.rich` to the cart) and `idFromLocation` (extracts the new order ID from the post-checkout URL).
- **`scripts/e2e/mail-message.ts`** – provides `mailMentions`, used inside `cy.emailTo(...)` to assert that the customer's instructions e-mail contains the transfer reference.

## Notes

- The test asserts clipboard fidelity by calling `cy.grantClipboard()` then comparing `navigator.clipboard.readText()` (whitespace-stripped) against the element text.
- Shipping method is set to **pickup** specifically so no address is needed to enable the checkout button; the test does not exercise address entry.
- The admin "awaiting transfer" filter is validated twice: once to confirm the order *appears*, and again (after recording payment) to confirm it *disappears* while a seeded `order.awaitingTransfer` order (fetched via `cy.subjectId`) still appears, proving the filter is loaded and correct.
- Final payment-state check is done via `cy.apiAs('user', 'GET', /orders/:id)` expecting `status === 'paid'`, not just UI text.
- No card payment is confirmed anywhere in this spec; it is intentionally card-budget-neutral.
