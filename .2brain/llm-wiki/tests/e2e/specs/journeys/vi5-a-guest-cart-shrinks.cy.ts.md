---
source: tests/e2e/specs/journeys/vi5-a-guest-cart-shrinks.cy.ts
sha256: e4cb9731cfb682bb46c1c3ef199e21fea5a230793f60cf89cce5a1fa3ad444fa
signature: 0fe242c909afe74058a1d01d97e1d26b097d60e1c8f3d80d21217a183a8bb29e
generated_at: 2026-11-10T07:23:08.732955+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/vi5-a-guest-cart-shrinks.cy.ts

## Purpose

Cypress e2e journey test (VI5) that verifies a guest's cart never trusts the locally-stored copy for prices or product state. It simulates an editor changing the shop (repricing, deleting, setting a product off-sale) via the API, then asserts the browser cart reflects those changes only after a reload. It also exercises quantity stepping, line removal, and full cart clearing (including `localStorage` wipe).

## Key elements

- **`BAR_COUNT`** — CSS selector for the nav-badge bubble that displays the live item count.
- **`priceOf(text)`** — Parses a cart-line string (`"unit × qty = total"`) and returns `{ unit, total }` in cents by delegating to `cents()`.
- **`guestAdds(name)`** — Visits `/en/products`, searches for the named product, and clicks *Add to cart* once.
- **`describe('VI5 · A guest cart shrinks')`** — Single spec that walks through: adding three products → verifying API-sourced prices → editor reprices one → reload shows new price → step-down / remove / reload persistence → editor deletes one (line marked "No longer available") → editor sets another off-sale (line marked "Not available right now") → clear-confirmation dialog empties cart and `localStorage`.

## Relationships

- **`tests/support/e2e/steps.ts`** — Imports `GUEST_CART_KEY` (the `localStorage` key asserted on clear), `cents` (dollar-string → integer-cents converter), and `searchAndOpenProduct` (storefront search + product-page navigation helper).
- **`scripts/e2e/cents.ts`** — Source of the `cents` utility that `priceOf` and the total assertions rely on (re-exported through `steps.ts`).

## Notes

- `beforeEach` calls `cy.restore()` to reset the seeded database between runs; the single `it` is the only test in this file.
- The test uses `cy.subjectProduct` guarantees (`product.inStock`, `product.barebones`, `product.rich`) to obtain concrete product fixtures at runtime rather than hard-coding IDs or prices.
- All editor mutations go through `cy.apiAs('editor', …)` to simulate backend changes, reinforcing the invariant that the browser never computes money.
- The `requires-module: cart, products` comment at the top indicates which feature modules must be present in the environment for this journey to run.
