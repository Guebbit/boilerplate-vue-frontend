---
source: tests/e2e/specs/journeys/cu27-my-cart-before-i-had-an-account.cy.ts
sha256: ea3d85f971b77eafaad497b65554bf7ade8cd216afb680610a4a38885cf0363c
generated_at: 2026-10-17T02:12:29.196768+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu27-my-cart-before-i-had-an-account.cy.ts

## Purpose

E2E test for journey CU27: a guest fills a browser-local cart, then signs in and the cart is merged into the account. Covers four scenarios — plain merge, quantity summation on an existing line, a product that was delisted while sitting in the guest cart, and a line exceeding available stock. Each scenario asserts the merge-alert content, its persistence (or dismissal) across reloads, and the server-side cart state.

## Key elements

- **`guestAdds(name)`** — Visits `/en/products`, searches for the given `product.*` guarantee, and clicks add-to-cart. Used to build a guest cart before sign-in.
- **`signInThroughTheForm()`** — Fetches `user` credentials via `cy.accountOf` and submits the login form.
- **`MERGE_ALERT` / `MERGE_ALERT_CLOSE`** — CSS selectors (`[data-test=cart-merge-report]` and its Dismiss button) used to assert and dismiss the post-merge report.
- **`describe('CU27 · …')`** — Top-level suite. `beforeEach` clears the user's cart via `DELETE /cart/all` so no pre-existing lines interfere.
  - *Test 1* — Guest cart survives reload, checkout is absent, sign-in merges (quantity preserved, `GUEST_CART_KEY` removed from `localStorage`).
  - *Test 2* — Account already holds 1 unit; guest adds 2 → merged line shows 3; alert text names the product, chosen qty, and resulting qty; dismissing the alert keeps it gone after navigation.
  - *Test 3* — Editor deletes the product while it sits in the guest cart; sign-in skips the line, alert says "no longer available," notification bell carries a persistent message; reload removes the alert but not the bell entry. Restores the product at the end.
  - *Test 4* — Guest chooses 2 of a 1-in-stock product; merge keeps qty at 2, flags "Not enough in stock" (no number); alert disappears on reload but the server-side flag remains on the cart line until the quantity is lowered to 1.

## Relationships

- **`tests/support/e2e/steps.ts`** — Source of `GUEST_CART_KEY` (the `localStorage` key used to verify the browser copy is cleared), `searchAndOpenProduct` (opens a seeded product page by guarantee name), and `submitLoginForm` (fills and submits the login form).

## Notes

- The file header declares `requires-module: account, cart, notifications, products`, signalling which server-side feature modules must be active for the test to pass.
- Test 3 also deletes the product from the user's wishlist (`DELETE /wishlist/:id`) before deleting the product itself, so the notification bell holds only the merge message and not a separate wishlist-removal notice.
- The "short stock" test asserts that the alert text contains **no stock count** — only the two quantity values — to guard against leaking internal inventory numbers into user-facing copy.
- Editor/shop mutations are done via `cy.apiAs('editor', …)` (Cypress `apiAs`), not the UI, to simulate the shop changing "under the guest."
- `cy.step(…)` calls are purely narrative; they do not gate assertions but give readable step markers in the run log.
