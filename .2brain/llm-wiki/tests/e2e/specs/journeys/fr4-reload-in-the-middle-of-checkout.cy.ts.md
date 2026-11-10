---
source: tests/e2e/specs/journeys/fr4-reload-in-the-middle-of-checkout.cy.ts
sha256: d3cecc3cbdb166e78cd4b94bcfc7af830dfca333ca1f4f08937742be65581c89
signature: 06c1fc1169361af0b620372cce75213919d68b90cc8aad4f6bb19152655682fa
generated_at: 2026-11-10T07:07:10.330988+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr4-reload-in-the-middle-of-checkout.cy.ts

## Purpose

Cypress end-to-end test for Feature Requirement 4: a browser reload (refresh, crashed tab, phone wake-up) occurring mid-checkout must not lose state. The suite verifies two layers of persistence—(1) server-persisted state (delivery method, default address, cart lines) survives a plain `cy.reload()`, and (2) browser-only state (notes text, payment method, a non-default address, an in-flight quantity update still inside its 400 ms debounce) is recovered from a `checkout-draft` entry in `sessionStorage` and is fully cleared on logout so the next user sees nothing.

## Key elements

- **`OrderLike`** (interface) – the subset of an order object the assertions read: `id`, `notes`, `paymentMethod`, `shippingMethod`, `shippingAddress`.
- **`OrdersPage`** (interface) – the order-search response shape (`items`, `meta.totalItems`) used by `orderCount`.
- **`orderCount()`** (const arrow, returns `Cypress.Chainable<number>`) – hits `POST /orders/search` with `pageSize: 1` and extracts the total count, used to assert "exactly one new order" was created.
- **`describe('FR4 · Reload in the middle of checkout')`** – the suite. `beforeEach` resets the cart and visits `/en`.
  - **Test 1** – "keeps the delivery method, the address and the lines across a reload, and places one order": adds one item, selects standard shipping, calls `cy.reload()`, asserts method/address/line are intact, completes checkout, and confirms the API order carries `standard` method and a non-empty city, with order count incremented by exactly 1.
  - **Test 2** – "gives back the note, the payment choice, a picked address and a last quantity click, and hands nothing to the next person": creates a second address, picks it plus bank-transfer payment, types a note, then fires a quantity-increase click and `win.location.reload()` in the *same tick* (before the 400 ms debounce fires). After reload it asserts all four browser-only fields are restored, verifies the keepalive PUT landed (quantity = 2 via `eventually` polling), logs out and confirms no `checkout-draft:*` keys remain in `sessionStorage`, then re-fills, reloads, checks out, and asserts the API order carries the note, `bank_transfer`, and city `Bologna`.

## Relationships

- **`tests/support/e2e/steps.ts`** – the sole import; provides the `eventually` polling helper used to wait for the post-reload keepalive request to land before reading the cart API.

## Notes

- The second test's reload is triggered via `win.location.reload()` in the same synchronous tick as the quantity click, intentionally beating the 400 ms debounce so the "pagehide" save path is exercised. The subsequent `eventually` poll on `GET /cart` accounts for the keepalive request arriving *after* the new page loads.
- Browser-only persistence is keyed with the `checkout-draft:` prefix in `sessionStorage`; the test explicitly asserts zero such keys remain after logout (privacy guarantee for shared tabs).
- Custom Cypress commands used throughout (`cy.apiAs`, `cy.loginAs`, `cy.logout`, `cy.restore`, `cy.subjectId`, `cy.goToCart`, `cy.step`, `cy.textareaIn`) are registered elsewhere in the support layer, not in this file.
- The `requires-module` comment at the top (`account, cart, delivery, orders, products`) signals the backend modules this journey exercises; useful for CI module-filtering.
