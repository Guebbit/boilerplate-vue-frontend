---
source: src/modules/cart/store.ts
sha256: 0539952e315519de74285a6b0519a47f5ec4dc8d87c1c22b9e407cc04da1ee03
generated_at: 2026-10-17T00:37:07.461605+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/store.ts

## Purpose

Pinia store that owns the shopping cart for both signed-in users (every mutation replaces the local `cart` ref with the server's full response) and signed-out visitors (a local guest list merged into the real cart on sign-in). It also hosts the checkout call, idempotency-key management, and the header-badge data derivations.

## Key elements

- **`useCartStore`** – Setup-store (`defineStore('cart', …)`). Exposes `cart`, `cartItems`, `cartSummary`, `cartShipping`, `badgeQuantity`, `badgeMoney`, `liveSummary`, guest-cart actions, `mergeReport`, `dismissMergeReport`, `checkoutKeyFor`, and the mutating actions (`addCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `mergeGuestCart`, `setShippingMethod`, `checkout`, `reorder`).
- **`CheckoutBody`** (exported type) – `CheckoutRequest` minus `expectedTotal`; the total is read off the store's own cart at call time.
- **`IN_FLIGHT_RETRY_DELAYS_MS`** (exported const) – `[1000, 2000, 4000]`; back-off schedule for re-sending the same idempotency key when the server answers `409 IDEMPOTENCY_IN_FLIGHT`.
- **`fetchTracked` / `takeCartSlot`** – Internal helpers that wrap `useStructureRestApi.fetchAny` with epoch counters and a ticket system so a stale background read cannot overwrite a fresher write.
- **`summarySeed` / `liveSummary`** – Lightweight `GET /cart/summary` seed for the badge; `liveSummary` prefers the full cart's summary once loaded.
- **`mergeReport`** – Memory-only list of `MergeReportLine[]` describing what the last guest-cart merge changed; cleared by `dismissMergeReport` or on viewer change.
- **`checkoutKeyFor(body)`** – Derives or reuses an `Idempotency-Key` from a fingerprint of (body, cart lines, shipping, viewer id); persisted via `checkout-attempt-storage`.
- **`useResetOnViewerChange(…)`** – Barrier that invalidates all in-flight tickets, clears `cart`, `summarySeed`, `mergeReport`, and any saved checkout/merge attempt when the viewer signs out or switches.
- **`isMergeRefusedForGood`** – Returns `true` for answered 400 / 413 / 422, meaning the guest list itself is invalid and should not be retried on next sign-in.

## Relationships

- **`use-guest-cart.ts`** – Provides `guestLines`, `addGuestItem`, `updateGuestItem`, `removeGuestItems`, `clearGuestCart`, `mergeKeyFor`; the store spreads these into its own public API.
- **`checkout-attempt-storage.ts`** – `readCheckoutAttempt` / `writeCheckoutAttempt` back the idempotency-key persistence inside `checkoutKeyFor` and `endCheckoutAttempt`.
- **`guest-cart-storage.ts`** – `readMergeAttempt` / `writeMergeAttempt` / `linesOfMergeAttempt` used during the merge-and-retry flow.
- **`domain/index.ts`** (barrel) – Exports `changedMergeLines`, `checkoutFingerprint`, `classifyCheckoutError`, `expectedTotalOf`, `subtractGuestLines` consumed by the store's merge and checkout logic.
- **`domain/merge-report.ts`** – `MergeReportLine` type and `changedMergeLines` helper shape the `mergeReport` ref.
- **`domain/expected-total.ts`** – `expectedTotalOf` computes the total injected into the checkout body.
- **`domain/checkout-errors.ts`** – `classifyCheckoutError` maps API errors to user-facing categories during `checkout`.
- **`domain/guest-cart.ts`** – `GuestCartLine` type and `subtractGuestLines` used when reconciling post-merge quantities.
- **`AddToCartButton.vue`** – Calls the store's `addCartItem` (signed-in) or `addGuestItem` (guest) actions.
- **`GuestCart.vue`** – Renders `guestLines` and invokes guest-cart mutation actions.
- **`MergeReportAlert.vue`** – Reads `mergeReport` and calls `dismissMergeReport`.
- **`use-cart-focus-refresh.ts`** – Triggers a cart re-fetch when the tab regains focus, relying on the store's ticket/epoch system to discard stale responses.
- **`use-cart-stock-poll.ts`** – Periodic background read of the cart; answers are gated by the same ticket ordering.
- **`src/modules/cart/index.ts`** – Re-exports `useCartStore`, `CheckoutBody`, and `IN_FLIGHT_RETRY_DELAYS_MS` to the rest of the app.

## Notes

- **Wholesale replacement, no patching.** Every mutating action sets `cart.value` to the API's full `CartResponse`. There is no local quantity-increment or item-splice; the server is the single source of truth.
- **Checkout lives here, not in the orders store.** It is `POST /cart/checkout`, it empties the cart, and keeping it co-located guarantees the header badge updates in the same tick the order is confirmed.
- **`summarySeed` is a seed, not a source.** Once `cart` is loaded, its `summary` field is authoritative. The seed exists only so the badge can render before the first full fetch.
- **`mergeReport` is volatile.** It is never persisted; a page reload or a new `GET /cart` does not touch it. Dismissal, viewer change, or a newer merge clears it.
- **Idempotency key is fingerprinted and sticky per tab.** A reload keeps the same key for the same order + viewer; a different fingerprint or a different viewer generates a new UUID. The key is sent as the `Idempotency-Key` header.
- **Merge "refused for good" (400/413/422)** permanently invalidates the stored guest list—`isMergeRefusedForGood` gates whether the list survives to the next sign-in attempt.
