---
source: tests/e2e/specs/journeys/cu27-my-cart-before-i-had-an-account.cy.ts
sha256: 3b106a52c5768f46ee256be7ed6397608d8be1c1f1b07f64a1d39927f33483fb
signature: c4355d9f2502265313ac78248209f1795f718eac9141007753d34f45438d7d6e
generated_at: 2026-11-10T06:58:24.640439+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/cu27-my-cart-before-i-had-an-account.cy.ts

## Purpose

End-to-end spec for CU27: a guest fills a browser-local cart, then signs in and the cart merges into the account's cart. It verifies that the guest cart survives reloads, that checkout is gated behind sign-in, and that the merge handles four distinct outcomes — clean merge, quantity summation, a product removed from the catalogue, and a line exceeding available stock — each with the correct alert/bell/line-flag behaviour.

## Key elements

- **`MERGE_ALERT` / `MERGE_ALERT_CLOSE`** – CSS selectors for the `[data-test=cart-merge-report]` alert and its Dismiss button.
- **`signInThroughTheForm(email, password)`** – resolves the seeded `user` account and submits the login form via `submitLoginForm`.
- **`guestAdds(name)`** – visits `/en/products`, opens a seeded product by guarantee name, and clicks Add to Cart.
- **`describe('CU27 …')`** – four `it` blocks, one per merge outcome (kept/merged, summed, refused, short). Each follows a step-by-step narrative with `cy.step()` markers.
- **`beforeEach`** – visits the storefront, runs `cy.restore()`, and wipes the user's server cart via `DELETE /cart/items` so assertions are unambiguous.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `GUEST_CART_KEY` (used to assert the browser-local cart is cleared after merge), `searchAndOpenProduct` (used by `guestAdds` to navigate to a product), and `submitLoginForm` (used by `signInThroughTheForm` to fill and submit credentials).

## Notes

- The "refused product" test calls `cy.apiAs('editor', 'DELETE', …)` to pull a product mid-flow and later restores it via `POST /products/:id/restore`. It also deletes the user's wishlist entry for that product first, because the delete would otherwise add a second bell notification and break the single-message assertion.
- The "short stock" test explicitly asserts that the alert text contains **only** the two quantity digits (`[2, 2]`) and no stock-count number, per the product's "no number" convention.
- The merge alert is ephemeral: every test confirms it disappears after `cy.reload()`, while the server-side flag on the cart line (or the bell notification) persists.
- `cy.checkPageA11y` is called in the "summed" and "short" tests to gate on accessibility of the alert/line markup.
