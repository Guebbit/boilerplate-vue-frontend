---
source: src/modules/payments/tests/e2e/order-reference-search.cy.ts
sha256: 56614a8b52b21d9555861a5dec7e4c9e8a15d156f7ab42ea51a52547673ac2bf
generated_at: 2026-10-17T01:24:18.663892+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/order-reference-search.cy.ts

## Purpose

End-to-end test for the admin's RF-reference lookup. It verifies the full happy-path (customer buys with bank transfer → admin pastes the displayed RF reference into the orders search → lands on the order's edit page) and the negative path (a non-matching reference produces an inline error without navigating away).

## Key elements

- **`describe('Order reference search')`** — top-level suite; calls `cy.restore()` in `beforeEach` to reset DB state.
- **`it('finds the order a pasted RF reference pays')`** — Happy path. Walks: product page → add to cart → cart → select `pickup` shipping + `bank_transfer` payment → checkout → order page. Reads the reference from `[data-test=transfer-reference]`, logs out, logs in as admin, pastes the reference into `[data-test=order-reference-search-input]`, and asserts the URL matches `/orders/<24-hex>/edit` with the `record-offline-payment-form` present.
- **`it('blocks the search in place…')`** — Negative path. Types a fake RF string into the same search input, clicks submit, and asserts the URL stays on `/orders` (no `/edit` redirect) and the inline `[data-test=order-reference-search-error]` contains "No order matches this reference."
- **`seedAccount` (import)** — Used solely to fetch the user's email and confirm the user is logged out before switching to admin.

## Relationships

- **`tests/support/e2e/scenario.ts`** — Provides `seedAccount(name)` which returns account details (here only `.email` is read) to verify the prior user session has been fully cleared.

## Notes

- The RF reference is read **as displayed** (space-grouped in fours). The test deliberately exercises the "paste" path the customer would use; the API is expected to tolerate the spaces, so this is not a raw-hex round-trip.
- The product is filtered by `product.rich` to guarantee a **physical, shippable** item — digital-only products reject a shipping method, which would break the checkout flow.
- Shipping method is `pickup` specifically because it requires no address, letting the checkout button enable without filling in a form.
- Checkout lands directly on the new order's page (`#order-target`), not a confirmation/redirect page — the test relies on this to read the reference in the same page context.
- The search input selector is a **compound** (`[data-test=order-reference-search-input] input`), implying the `data-test` attribute is on a wrapper element, not the `<input>` itself.
