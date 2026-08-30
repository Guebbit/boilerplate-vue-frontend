# src/modules/cart/store.ts

## Purpose

Pinia setup store that owns the authenticated user's shopping cart. Every mutating action **replaces** the local `cart` ref wholesale with the payload the API returned — the store never patches items locally. All derived state (items list, summary, badge count) is computed from that single ref. Checkout lives here (not in an orders store) because it is the one call that empties this store's responsibility.

## Key elements

- **`useCartStore`** — the exported Pinia store (`defineStore('cart', …)`), setup-function style.
- **`cart`** (`ref<CartResponse | undefined>`) — single source of truth; `undefined` means "not yet fetched or emptied by checkout".
- **`cartItems` / `cartSummary`** (computed) — convenience slices off `cart`.
- **`summarySeed`** (ref) — lightweight `CartSummaryResponse` fetched separately so a header badge doesn't require the full cart.
- **`badgeQuantity`** (computed) — prefers `cart.summary.itemsCount`; falls back to `summarySeed` before the full cart is loaded.
- **`fetchSummary`** — `GET /cart/summary`; swallows 401 (guest = no cart) and rethrows all other errors.
- **`fetchCart`** — `GET /cart` via `fetchAny` (loading-state managed by `useStructureRestApi`).
- **`upsertCartItem` / `updateCartItem` / `removeCartItem` / `clearCart`** — the four mutation actions; each replaces `cart.value` with the API response.
- **`checkout`** — `POST /cart/checkout`; on success sets `cart.value = undefined` (server emptied it); on transport failure fires an analytics event before rethrowing.
- **`reorder`** — copies a prior order back into the cart; replaces `cart` with the response (skipped items are visible because the server already removed them).
- **`productTitles` / `titleOf` / `resolveTitles`** — id → title cache for lines the API returns as bare `productId`; failures are silently ignored (the id is still rendered).

## Relationships

- **`src/modules/cart/index.ts`** — barrel file that re-exports `useCartStore` so the rest of the app imports from `@/modules/cart` rather than reaching into `store.ts` directly.
- **`src/modules/cart/module.ts`** — registers the cart Pinia store (and its API dependencies) in the Vue plugin / module provider chain, making `useCartStore` available app-wide.

## Notes

- **No local mutation.** If you need to add an item, call the API action; the store will overwrite `cart`. There is no `cartItems.value.push(…)` path.
- **`fetchSummary` 401 handling is intentional.** It distinguishes "guest, no cart" from "network down" — swallowing any other error would blank the badge for a user who does have a cart.
- **`summarySeed` is a one-time seed.** Once `fetchCart` (or any mutation) resolves, `badgeQuantity` reads from `cart.summary` and the seed is stale. Do not rely on it after the first full fetch.
- **Checkout sets `cart` to `undefined`, not an empty object.** All computed getters already treat `undefined` as empty, so this is safe, but code that reads `cart.value.items` without a null-check will break.
- **`productTitles` lives in this store, not the products store, to avoid a circular dependency** (`products → cart` is a declared edge; the reverse would close a loop). It calls `@api` directly rather than going through a sibling store.
- **Renamed exports.** The internal functions are `upsertCartItemAction`, `removeCartItemAction`, `clearCartAction`, but the store exposes them as `upsertCartItem`, `removeCartItem`, `clearCart` to match the API verb names.
