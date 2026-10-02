---
source: src/modules/payments/tests/e2e/order-reference-search.cy.ts
sha256: b4b1cd7134832396550a10f8d22580ec1bd0e957104513b8d41559dabac932df
generated_at: 2026-10-02T15:30:22.027501+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/e2e/order-reference-search.cy.ts

## Purpose

Cypress e2e spec that walks the full RF-reference lookup loop: a customer checks out via bank transfer (the only method that freezes an RF reference onto the order), then an admin pastes that reference into the orders-list search box and is taken directly to the order's edit page. A second case verifies that an unmatched reference produces an inline error rather than a navigation or toast.

## Key elements

- **`describe('Order reference search')`** — suite; `beforeEach` visits `/en` and calls `cy.restore()`.
- **`it('finds the order a pasted RF reference pays')`** — happy path. Buys a physical product with `pickup` + `bank_transfer`, reads the displayed RF text (grouped in 4s), logs out, logs in as admin, types the reference into `[data-test=order-reference-search-input] input`, submits, and asserts the URL matches `/orders/<24-hex>/edit` with `#order-edit-page` and `[data-test=record-offline-payment-form]` visible.
- **`it('blocks the search in place, not with a toast, for a reference nothing matches')`** — error path. Types a fabricated RF, submits, asserts the URL stays on `/orders` (no `/edit`), and that `[data-test=order-reference-search-error]` contains "No order matches this reference."
- **`seedAccount('user').email`** — used only to assert the user's email is absent after logout.

## Relationships

- **`tests/support/e2e/scenario.ts`** — imports `seedAccount` to resolve the test user's email for the post-logout assertion. No other symbols are imported from this file.

## Notes

- Product selection filters on `product.rich` (a physical, shippable item). Digital-only products reject shipping outright (error E16), so `.first()` on the general product list is not safe for this flow.
- `pickup` is chosen as the shipping method because it requires no address, which unblocks the checkout button on the payment-method step alone.
- The RF is read via `.invoke('text')` from the rendered panel (spaces included). The API tolerates those spaces, so the test exercises the same paste a human would perform rather than an exact-value round-trip.
- The search input lives inside a wrapper: the selector is `[data-test=order-reference-search-input] input` (child `input`), not the `data-test` element itself.
- `cy.loginAs` and `cy.restore` are custom commands (not shown in this file) expected to be registered in the broader Cypress support layer.
