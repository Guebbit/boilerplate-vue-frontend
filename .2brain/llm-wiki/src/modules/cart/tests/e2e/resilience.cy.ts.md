---
source: src/modules/cart/tests/e2e/resilience.cy.ts
sha256: 7121de78dbddaff668ebf48193d90192d741ce66021e0d0da30342e04f43a65a
signature: 7121de78dbddaff668ebf48193d90192d741ce66021e0d0da30342e04f43a65a
generated_at: 2026-11-10T04:05:03.575358+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/tests/e2e/resilience.cy.ts

## Purpose

Cart-specific slice of the shell-wide resilience sweep. It verifies that the `/en/cart` route renders without unexpected console errors and stays within the viewport, in two states: empty and holding one line item. It intentionally asserts **no** prices or values so that layout/logic bugs surface even when value-focused specs pass.

## Key elements

- **`describe('the cart renders whatever it holds')`** — top-level suite; each test first clears the cart via `DELETE /cart/items` and logs in as `'user'`.
- **Test: "serves an empty cart quietly and inside the viewport"** — clears the cart, then calls `assertRouteIsHealthy('/en/cart', '#cart-page')`.
- **Test: "serves a cart holding a line quietly and inside the viewport"** — clears the cart, adds one in-stock product (`cy.subjectId('product.inStock')`) via `POST /cart/items`, calls `assertRouteIsHealthy`, and confirms a single `[data-test=cart-item]` node exists.

## Relationships

- **`tests/support/e2e/resilience.ts`** — provides the shared `assertRouteIsHealthy` helper (console-error check + viewport-fit check) imported and used by both tests in this file.

## Notes

- The file deliberately avoids asserting any price, quantity, or product name. This is a design choice documented in the header comment: a page can emit a `TypeError` or push content off-screen while every value-naming spec remains green.
- `cy.subjectId('product.inStock')` is a project fixture lookup (not a standard Cypress command); the exact product is irrelevant to this test's contract.
- Tests run against `/en/cart` with the `#cart-page` root selector — keep both in sync if the route or container id changes.
