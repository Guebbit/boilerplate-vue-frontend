---
source: src/modules/payments/tests/e2e/order-reference-search.cy.ts
sha256: 56614a8b52b21d9555861a5dec7e4c9e8a15d156f7ab42ea51a52547673ac2bf
signature: 56614a8b52b21d9555861a5dec7e4c9e8a15d156f7ab42ea51a52547673ac2bf
generated_at: 2026-11-10T05:14:03.412023+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/order-reference-search.cy.ts

## Purpose

Cypress e2e test for the admin RF-reference lookup. It verifies the full loop: a customer checks out by bank transfer (the only payment method that mints a frozen RF reference onto the order), then an admin pastes that reference into the orders-list search and lands directly on the order's edit page where `RecordOfflinePaymentForm` is already available.

## Key elements

- **`describe('Order reference search')`** — the suite; `beforeEach` visits `/en` and calls `cy.restore()` to reset seeded state.
- **`it('finds the order a pasted RF reference pays')`** — Happy-path test. Walks: login as customer → add a `product.rich` item to cart → select `pickup` shipping and `bank_transfer` payment → checkout → read the displayed reference from `[data-test=transfer-reference]` → logout → login as admin → type the reference into `[data-test=order-reference-search-input]` → assert redirect to `/orders/:id/edit` and presence of `[data-test=record-offline-payment-form]`.
- **`it('blocks the search in place, not with a toast, for a reference nothing matches')`** — Negative test. Types a non-matching reference, asserts the URL stays on `/orders` (no `/edit`), and that `[data-test=order-reference-search-error]` contains "No order matches this reference."

## Relationships

- **`tests/support/e2e/scenario.ts`** — imports `seedAccount` to retrieve the seeded user's email, which the happy-path test uses to confirm the customer is logged out before the admin login.

## Notes

- The RF reference is read **as displayed on the order page** (grouped in 4-digit blocks, e.g. `RF00 1234 …`). The test deliberately uses this formatted string in the admin search to mirror a real user's paste rather than the raw API value.
- The happy path selects a product via `filterByNarrowestCategoryOf('product.rich')` and picks `pickup` shipping to avoid requiring an address — a digital-only product would not ship and would break the flow.
- The negative test hard-codes a reference in the `RF00 0000 0000 0000 0000 0000 0` shape to guarantee no match without needing a known-good reference.
