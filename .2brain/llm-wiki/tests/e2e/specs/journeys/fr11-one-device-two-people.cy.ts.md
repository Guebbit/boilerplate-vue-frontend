---
source: tests/e2e/specs/journeys/fr11-one-device-two-people.cy.ts
sha256: a9b51d05797e982331731eb2f618b52c4235beaf968a28d420f4cf39ff6bda65
generated_at: 2026-10-17T02:15:20.777561+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr11-one-device-two-people.cy.ts

## Purpose

End-to-end test for **FR11 (one device, two people)**. Verifies that when a second person signs in on the same tab after a first person's session ends, the UI shows only the second person's cart and wishlist — nothing from the first person lingers. Also verifies that a logout broadcast from a second tab (via `BroadcastChannel`) signs out this tab and clears the cart badge.

## Key elements

- **`describe('FR11 · One device, two people')`** — single test covering the full journey.
- **`beforeEach`** — visits `/en`, calls `cy.restore()` to reset app state, then visits `/en` again.
- **Test body** — steps through: first person fills cart + wishlist → `cy.switchUser('secondShopper')` → asserts empty bar → intercepts wishlist with a 2500 ms delay to catch in-flight state leaks → second person adds their own item → posts a `logout` message on a fresh `BroadcastChannel('session')` instance → asserts signed-out state and cleared badge.
- **BroadcastChannel simulation** — creates a *second* `BroadcastChannel('session')` in the page to post `{ type: 'logout' }`, since a channel never receives its own posts and the app's instance is module-private.

## Relationships

- **`tests/support/e2e/steps.ts`** — imports `addToCartFromStorefront`, `searchAndOpenProduct`, and `addOpenProductToCart` for common UI-interaction steps.

## Notes

- Requires modules `account`, `cart`, `products`, `wishlist` (per the `requires-module` comment).
- The second person is the seeded **`secondShopper`** customer; staff accounts hold no shopping key and therefore cannot act as the second shopper.
- The wishlist delay intercept (2500 ms) is intentional: a state leak from the first person would only be visible while the refetch response is still in flight.
- After the cross-tab logout, the test also asserts `add-to-cart` is **not disabled**, confirming the guest can still shop (the second person's lines are simply gone from the bar).
