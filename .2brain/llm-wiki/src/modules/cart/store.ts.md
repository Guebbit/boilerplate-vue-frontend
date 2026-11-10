---
source: src/modules/cart/store.ts
sha256: eb7fdaa67eec2fd35286a517bcba2dd7c40017cda63c6d91117008eaeefd0c59
signature: f6d03cb4ca6857b2c1849ebe498eca4c4bdb5e9fcfa362aa5d54d225099d0188
generated_at: 2026-11-10T04:00:14.862063+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/store.ts

## Purpose

Pinia store that owns the entire shopping-cart lifecycle for both signed-in users and guest visitors. Every mutating action replaces the local `cart` ref wholesale with the API's authoritative response rather than patching fields locally. It also houses checkout (because `POST /cart/checkout` empties the cart this store is responsible for) and coordinates guest-cart merging on sign-in.

## Key elements

- **`useCartStore`** – the Pinia store (`defineStore('cart', …)`). Exposes state, getters, and all cart/checkout actions.
- **`CheckoutBody`** (exported type) – `Omit<CheckoutRequest, 'expectedTotal'>`; callers supply the checkout request without the total, which the store reads from the cart it holds.
- **`cart` / `cartItems` / `cartSummary` / `cartShipping`** – core state (`ref<CartResponse>`) and derived computeds. All getters derive from this single ref.
- **`summarySeed` / `liveSummary`** – lightweight `GET /cart/summary` cache used for the header badge before a full cart load; `liveSummary` prefers the full cart's summary when available.
- **`badgeQuantity` / `badgeMoney`** – header-badge computeds (total unit count and money total + currency as one object to avoid partial reads).
- **`mergeReport` / `dismissMergeReport`** – in-memory list of lines affected by the last guest→signed-in merge (quantity shortfalls, out-of-stock, refused). Cleared on dismissal, viewer change, or a newer merge.
- **`fetchSummary`** – fetches the badge summary; treats 401 as "no cart" (not an error).
- **`replaceCartFrom`** – internal helper that wraps a generated API call, tracks it via `fetchTracked` + ticket slot, stores the server's cart, and optionally invalidates the products cache.
- **`fetchTracked` / `takeCartSlot` / `cartTickets` / `summaryTickets` / `cartEpoch` / `writesInFlight`** – concurrency-control machinery (request tickets + epoch counter) ensuring a slow stale response never overwrites a fresher one, and that background polls discard their answer if a write or viewer change intervened.
- **`useGuestCart()`** destructuring – guest-cart state and actions (`guestLines`, `addGuestItem`, `mergeKeyFor`, etc.) lifted into the store's surface.
- **`useResetOnViewerChange(…)`** – resets cart, summary seed, merge report, checkout attempt, guest cart, and merge-attempt storage when the viewer signs out or switches account.
- **`seeding` / `signInRead`** – shared in-flight promises so concurrent sign-in reads (merge or summary) coalesce and the first full cart read waits for them.

## Relationships

- **`src/modules/cart/domain/index.ts`** – imports `changedMergeLines`, `classifyCheckoutError`, `emptyCart`, `subtractGuestLines` and the `GuestCartLine` / `MergeReportLine` types used by merge and checkout logic.
- **`src/modules/cart/checkout-attempt-storage.ts`** – imports `checkoutKeyFor` and `endCheckoutAttempt` to track and clear the in-flight checkout attempt across reloads.
- **`src/modules/cart/guest-cart-storage.ts`** – imports `linesOfMergeAttempt`, `readMergeAttempt`, `writeMergeAttempt` to persist the pending merge attempt on the client.
- **`src/modules/cart/composables/use-guest-cart.ts`** – destructures the full guest-cart composable into the store, making its state and actions available to consuming components.
- **`src/modules/cart/domain/checkout-errors.ts`** – provides `classifyCheckoutError` used by the checkout action to categorise API failures.
- **`src/modules/cart/domain/empty-cart.ts`** – provides `emptyCart` used to reset local state after a successful checkout or clear.
- **`src/modules/cart/domain/guest-cart.ts`** – provides guest-cart line types and helpers consumed by the merge flow.
- **`src/modules/cart/domain/merge-report.ts`** – provides `MergeReportLine` type and `changedMergeLines` for building the post-merge alert data.
- **Consuming components** (`src/modules/cart/components/AddToCartButton.vue`, `src/modules/cart/components/GuestCart.vue`, `src/modules/cart/components/SignedInCart.vue`, `src/modules/cart/components/MergeReportAlert.vue`) read store state and call store actions; the store is the single source they observe.
- **Consuming composables** (`src/modules/cart/composables/use-cart-focus-refresh.ts`, `src/modules/cart/composables/use-cart-stock-poll.ts`, `src/modules/cart/composables/use-checkout-refusals.ts`) call store actions and read store state to drive focus-based refresh, stock polling, and checkout refusal handling.

## Notes

- **Whole-replace, never patch.** Any code that assumed it could mutate `cart.value.items` in place will silently lose its changes on the next API round-trip.
- **Ticket/epoch concurrency.** The ticket system (`createRequestTickets`) and `cartEpoch` counter exist because `pollCart`, user-initiated writes, and the sign-in merge can all be in flight simultaneously. Bypassing `replaceCartFrom` / `fetchTracked` for a cart write will break ordering guarantees.
- **`summarySeed` is a seed, not a source of truth.** Once `cart` is loaded, `liveSummary` always prefers `cart.value.summary`. Never treat `summarySeed` as current after a mutation.
- **Guest cart survives page reload** (persisted via `src/modules/cart/guest-cart-storage.ts`) but is **cleared on viewer change** so a shared browser never leaks one account's unmerged lines to the next.
- **`mergeReport` is memory-only.** A page reload discards it; the server keeps no copy of what the guest originally asked for.
- **Checkout lives here, not in the orders store.** The rationale is documented in the file: it is `POST /cart/checkout`, it empties the cart, and owning it elsewhere would leave stale items in the header after a completed order.
