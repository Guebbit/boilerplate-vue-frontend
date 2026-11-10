---
source: tests/e2e/specs/journeys/fr11-one-device-two-people.cy.ts
sha256: 9cb3c7a311030a11fd70f09f8af93b9e956ebf434b4ab32025aa30971018ba00
signature: 9cb3c7a311030a11fd70f09f8af93b9e956ebf434b4ab32025aa30971018ba00
generated_at: 2026-11-10T07:03:47.250766+00:00
model: ollama:qwen3.8:27b
---

# tests/e2e/specs/journeys/fr11-one-device-two-people.cy.ts

## Purpose

End-to-end test for FR11 (one device, two people). Verifies that when a second person signs in on the same browser tab without a reload, the cart badge, cart total, and wishlist hearts belong to the second person—no state from the first person leaks. Also verifies that a `logout` message posted on the `session` BroadcastChannel from another tab signs out this tab and clears the bar.

## Key elements

- **`describe('FR11 · One device, two people')`** – single spec with one test case covering the full journey.
- **`beforeEach`** – visits `/en`, restores fixtures (`cy.restore()`), revisits to reset the app state.
- **`cy.switchUser('secondShopper')`** – swaps the authenticated identity to the seeded second-shopper customer within the same tab (no reload).
- **Wishlist-intercept step** – intercepts `GET **/wishlist` and adds a 2500 ms response delay to confirm the heart state does not flash the first person's saved state while the refetch is in flight.
- **`otherTab.post({ type: 'logout' })`** – simulates the other-tab logout over the `session` BroadcastChannel to verify cross-tab sign-out.

## Relationships

- **`tests/support/e2e/steps.ts`** – imports `addToCartFromStorefront`, `addOpenProductToCart`, and `searchAndOpenProduct` for user-facing cart/product actions.
- **`tests/support/e2e/harness.ts`** – imports `otherTab`, which provides the BroadcastChannel stand-in used to post the logout message as if another tab sent it.

## Notes

- The spec requires four feature modules to be available: `account`, `cart`, `products`, `wishlist` (declared in the `requires-module` comment).
- The wishlist-delay intercept (`2500 ms`) is intentional: it exercises the window where a stale/in-flight state could leak the first person's heart. The test asserts the toggle reads "Save to wishlist" both before and after the delayed response resolves.
- The test asserts the cart total is explicitly `0.00` after switching users, not merely "no badge," because an empty cart still renders a zero total.
- `otherTab.post` is a test-harness substitute for a real second browser tab; it posts the `session` BroadcastChannel message directly.
