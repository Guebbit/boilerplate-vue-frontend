---
source: tests/e2e/specs/journeys/cu29-the-order-answer-got-lost.cy.ts
sha256: 42894de63242f147a30658fb48060898e72de021564c1bb2ec32abfb251da9f0
generated_at: 2026-10-17T02:12:52.163124+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu29-the-order-answer-got-lost.cy.ts

## Purpose

E2E test for CU29: a customer's `POST /cart/checkout` succeeds on the server but the response is lost in transit (swapped to a 502). The test verifies the customer can safely press "Place order" again and that the idempotency mechanism returns the *first* order rather than creating a second one.

## Key elements

- **`OrdersPage`** (interface) — shape of the paginated orders-list API response (`items`, `meta.totalItems`).
- **`orderCount()`** — helper that calls `GET /orders?pageSize=1` as the user and returns `meta.totalItems` as a `Cypress.Chainable<number>`.
- **`describe` / `it` block** — single test that:
  1. Logs in, adds `product.rich` to cart, selects `pickup` shipping.
  2. Intercepts the first `POST **/cart/checkout`: lets the real request through, then in the `response` callback sends a 502 back to the browser.
  3. Asserts the error UI is shown **and** the API order count incremented by 1 (server applied it).
  4. Clicks checkout a second time; asserts the second request carries the **same** `Idempotency-Key` and body as the first.
  5. Asserts order count is still `before + 1`, cart is empty (UI and API).

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront` to populate the cart from the storefront rather than hitting the API directly.

## Notes

- The intercept uses `request.on('response', …)` so the **real** server processes the request and only the *response* is mutated. This is deliberately "applied, then lost" — not a full stub.
- `pickup` is chosen as the shipping method because it requires no address, keeping the test focused on the idempotency path.
- `cy.apiAs('user', …)` is a project-level custom command (not defined in this file) used for authenticated API assertions.
- The `beforeEach` calls `cy.restore()` between visits to reset application state.
