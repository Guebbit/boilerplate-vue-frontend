---
source: tests/e2e/specs/journeys/cu5-price-moves-while-in-cart.cy.ts
sha256: 00312eb8b2ce4a20abc2549145afbd0196f3e14d0e86d383cc939104bde5ec72
signature: bd43c6ac4db1c984d880bb454b3530907017ac1439933ee4abf7c409ae4c0fd1
generated_at: 2026-11-10T07:01:29.100800+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu5-price-moves-while-in-cart.cy.ts

## Purpose

End-to-end journey test (CU5) verifying that a product repriced while sitting in a customer's cart updates the cart line and total on reload, while a confirmed order keeps the price that was in effect at checkout. Confirms the "live cart vs. frozen order" price semantics across two distinct repricing events.

## Key elements

- **`ProductLike`** — minimal interface (`{ price: string }`) used as the response type for the editor's `PATCH /products/:id` call.
- **`unitCents(text)`** — local helper that extracts the unit-price cents from a cart-line string by splitting on the `×` character and delegating to `cents()`.
- **`describe` / `it` block** — single test that walks the full scenario: add-to-cart → verify price → editor raises price via API → reload → verify cart follows → checkout at new price → editor lowers price again → verify order is unchanged.

## Relationships

- **`tests/support/e2e/steps.ts`** — direct import source for `addToCartFromStorefront`, `cents`, `centsOf`, and `idFromLocation`. These provide the UI automation steps and monetary-parsing utilities used throughout the test.
- **`scripts/e2e/cents.ts`** — transitive dependency (pulled in via `steps.ts`) supplying the `cents` / `centsOf` helpers that parse dollar-strings into integer cents for assertions.

## Notes

- The editor actor interacts exclusively through `cy.apiAs` (REST `PATCH`), never through the storefront UI. It is intentionally the "background" role.
- Prices are handled as integer cents in assertions but converted to two-decimal dollar strings for the API body (`(raised / 100).toFixed(2)`).
- Checkout is unblocked by selecting the `pickup` shipping method, which avoids any address-form requirement.
- `beforeEach` calls `cy.restore()` between two `cy.visit('/en')` calls to reset application state before each run.
- The `requires-module` header comment lists the backend modules this journey exercises: `account`, `cart`, `inventory`, `orders`, `products`.
