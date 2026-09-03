# src/modules/cart/store.ts

## Purpose

Pinia setup store that owns the authenticated user's shopping cart. Every mutating action (add, update, remove, clear, checkout, reorder) replaces the local `cart` ref wholesale with the API's response rather than patching state locally. All derived getters (`cartItems`, badge fields, etc.) read from that single source of truth.

## Key elements

- **`useCartStore`** — the single export; a `defineStore('cart', () => {…})` setup store.
- **`cart`** (ref) — the full `CartResponse` (items + summary) returned by the API; the sole source of truth for all getters.
- **`cartItems` / `cartSummary`** (computed) — convenience slices of `cart`.
- **`summarySeed`** (ref) — lightweight `GET /cart/summary` payload, used only before a full cart fetch has occurred.
- **`liveSummary`** (computed) — prefers `cart.summary` when present, falls back to `summarySeed`.
- **`badgeQuantity` / `badgeTotal` / `badgeCurrency`** (computed) — values for the header cart badge (unit count, pre-shipping total, currency).
- **`fetchSummary()`** — fetches the lightweight summary; swallows 401 (guest = no cart) silently.
- **`fetchCart()`** — fetches the full cart via `fetchAny` (auto loading flag).
- **`upsertCartItem` / `updateCartItem` / `removeCartItem` / `clearCart`** — mutating actions; each replaces `cart` with the API response.
- **`checkout(checkoutData?)`** — `POST /cart/checkout`; on success sets `cart = undefined` (server empties it). Lives here by design, not in the orders store.
- **`reorder(orderId)`** — copies an order back into the cart; response replaces local state.
- **`productTitles`** (ref) / **`titleOf(id)`** / **`resolveTitles(ids)`** — caches product display names by id so cart lines render a human-readable title instead of a raw UUID. Failures leave the id as the fallback.
- **`loading`** — per-key loading flag from `useCoreStore` / `useStructureRestApi`, toggled automatically around every `fetchAny` call.

## Relationships

- **`src/modules/cart/index.ts`** — barrel file that re-exports `useCartStore` so consumers import from the module root rather than reaching into `store.ts` directly.
- **`src/modules/cart/module.ts`** — Pinia module registration; lists this store (by name `'cart'`) so the toolkit's module system can discover and wire it into the application's store graph.

## Notes

- **Wholesale replacement, never local patching.** After any mutation the UI must re-derive from the API payload; there is no optimistic local update. This is intentional and documented in the module docblock.
- **Checkout ownership is deliberate.** The file's docblock explains why checkout is here rather than in the orders store: it is `POST /cart/checkout`, it empties the cart this store owns, and placing it elsewhere would leave a stale local cart after a completed order.
- **`summarySeed` is a one-way ratchet.** Once `cart` is fetched, `liveSummary` ignores the seed. The seed exists only to give the header badge data before the first full fetch.
- **401 in `fetchSummary` is not an error.** The catch block checks `absentIs(error, 401)` specifically; any other status is re-thrown. Swallowing non-401 failures would blank the badge for users who do have a cart.
- **`productTitles` lives here (not in a products module)** because `products → cart` is a declared dependency edge; placing it in products would create a circular import.
- **`resolveTitles` uses `Promise.allSettled`** — individual product lookups that 404 (e.g. delisted items) are silently skipped; the id is still rendered as a fallback.
- **Export name aliases:** the internal functions are named `upsertCartItemAction` / `removeCartItemAction` / `clearCartAction` to avoid colliding with the imported API functions of the same base name; they are exported under the shorter names `upsertCartItem`, `removeCartItem`, `clearCart`.
