---
source: tests/e2e/specs/journeys/cu13-my-order-history.cy.ts
sha256: 711e77b495d3f4681b9a128a5e645a21e8cf2d91a318f74d70b22b0b9eaca62e
generated_at: 2026-10-17T02:09:50.611897+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu13-my-order-history.cy.ts

## Purpose

E2E journey test for CU13 (My Order History). Verifies that a logged-in customer sees only their own orders (by order number, never database ID), can narrow the list by status, and that a delivered order's detail page renders payment status, fulfillment status, shipping, parcel, and an invoice link that opens in a new tab. Cross-checks every UI claim against the API for the same account.

## Key elements

- **`LARGEST_PAGE`** (`'50'`) – page-size option that displays the maximum number of rows, used to ensure the full history is visible in one page.
- **`ListedOrder`** – minimal interface (`id`, `orderNumber?`, `status`) describing one item in the API's order list response.
- **`rowIds()`** – extracts the order ID (last path segment of the `href`) from each row's `[data-test=row-view]` link; returns a `Cypress.Chainable<string[]>` for assertion.
- **`describe('CU13 · My order history')`** – single test suite.
  - **`beforeEach`** – visits `/en`, calls `cy.restore()`, re-visits `/en` to reset SPA state.
  - **`it(...)`** – one long test broken into `cy.step()` blocks:
    1. Opens orders via the account menu, selects page size 50.
    2. Asserts row count, ID ordering, and order-number cells match the API list; asserts two foreign orders (`order.softDeleted`, `order.otherPending`) are absent.
    3. Applies the "Delivered" status filter; asserts the filtered rows match the API's `?status=delivered` response.
    4. Opens the seeded `order.delivered` detail page; asserts payment status, fulfillment status, payment method, shipping, shipment status, and absence of a shipping address (pickup order).
    5. Stubs `window.open`, clicks the invoice link, asserts it was called once with a `blob:` URL and `_blank` target.

## Relationships

No graph neighbors recorded. The test depends on the `delivery`, `orders`, and `payments` modules (per the `requires-module` comment) and on seeded test fixtures (`order.delivered`, `order.softDeleted`, `order.otherPending`, user `user`).

## Notes

- The seeded delivered order is a **pickup**, so the test explicitly asserts `order-shipping-address` does **not** exist. Shipping-address display is deferred to CU15.
- The test performs **no payment actions**; card budgets are intentionally untouched.
- `cy.stubWindowOpen()` intercepts `window.open` so the invoice "new tab" check never actually opens a browser tab.
- All selectors use `data-test` attributes rather than CSS class names or text, coupling the test to the application's test-id contract.
- `cy.subjectId(key)` is a custom command that resolves a fixture key to its concrete entity ID; the fixture keys (`order.delivered`, etc.) must exist in the seed data.
