---
source: tests/e2e/specs/journeys/fr21-signed-in-from-another-tab.cy.ts
sha256: 1104188a10813c23a36abfb274af99ea56994a31d7b934e25b7432b6c697f8d2
signature: 88912b378dc5ed97be3e8a743bdbfee89d9f130ee5650eb40f33103222177a83
generated_at: 2026-11-10T07:06:33.919170+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr21-signed-in-from-another-tab.cy.ts

## Purpose

Cypress journey test for FR21 ("I signed in from another tab"). Verifies that when a second browser tab signs in, the current tab detects the session change without a reload: a guest cart line is merged into the new customer's cart exactly once, and a tab already acting as one customer cleanly switches to the second customer without mixing identities.

## Key elements

- **`CartLines`** — local interface modelling the `{ items: { productId, quantity }[] }` slice of `GET /cart` that the assertions read.
- **`beforeEach`** — visits `/en`, restores fixture state, and wipes the user's cart (`DELETE /cart/items`) so any line present is only there because the test added it.
- **Test 1: "this tab becomes the customer and the guest line is merged once"** — adds an in-stock product to the guest cart, then calls `otherTab.signIn('user')`. Asserts the nav switches to logged-in state, and that `GET /cart` shows exactly one line for that product with quantity 1 (no double-merge).
- **Test 2: "a tab that was one customer becomes the other, never a mix"** — signs this tab in as `user`, then `otherTab.signIn('secondShopper')`. Asserts that `GET /account` returns the second shopper's email and the user menu displays it.

## Relationships

- **`tests/support/e2e/harness.ts`** — imports `otherTab`, whose `signIn(role)` method simulates the second tab: it performs a real login (cookies land in the browser jar) and broadcasts a `login` message on the `session` channel so the open tab reacts without a reload.

## Notes

- Header comment `requires-module: account, cart, products` declares which backend modules this story depends on.
- The "exactly once" guarantee is enforced by asserting both `length === 1` **and** `quantity === 1`; a double-merge would produce either two lines or quantity 2.
- `cy.subjectProduct('product.inStock')` is a project-level custom command that resolves a seeded product; it is not a stock Cypress command.
- The test deliberately does **not** reload the page after `otherTab.signIn`; the entire point is that the session change propagates via the `session` channel message.
