# docs/modules/cart.md

## Purpose

Documents the `cart` domain module: its single screen (`Cart`), its Pinia store (`useCartStore`), and the checkout flow. This is the `core` subdomain — the module other domains point at to add, remove, or settle cart lines. It owns `badgeQuantity`, the one reactive value the application shell reads for the header badge.

## Key elements

- **`useCartStore`** (`store.ts`) — The single published export. Holds `cart`, `productTitles` state; `cartItems`, `cartSummary`, `cartCount`, `badgeQuantity`, `loading` getters; and 10 actions (`fetchSummary`, `fetchCart`, `checkout`, `reorder`, `upsertCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`, `titleOf`, `resolveTitles`).
- **`badgeQuantity`** — A getter the shell header reads as an *accessor* (not a number). The shell calls it once in its own setup and renders the ref.
- **`domain/quantity.ts`** — Pure client-side rules over plain data (no store, no component, no axios).
- **`index.ts`** — Public barrel; the only surface a sibling module may import.
- **`module.ts`** — The manifest the application loads directly: name, routes, nav entries, response schemas, dependency edges, locales.
- **`response-schemas.ts`** — One Zod envelope per endpoint (8 total), registered through the manifest.
- **`views/Cart.vue`** — The sole screen, at `/:locale/cart`, auth-gated.
- **`ShippingSelector`** (from `delivery`) — Mounted inside checkout; the cart never inspects a shipping rate.
- **Analytics:** emits `analyticsEvents.CHECKOUT_REQUEST_FAILED` on checkout failure.

## Relationships

- → **`delivery`** (`docs/modules/delivery.md`) — *published-language*: the checkout step mounts `ShippingSelector`, a self-contained component. The cart module does not learn what a rate is; delivery does not learn about the cart store.
- ← **`orders`**, **`products`** — *customer-supplier*: the reorder button and add-to-cart button call cart-store actions to write lines.
- ← **`wishlist`** — *conformist*: move-to-cart hits a wishlist endpoint, then asks the cart store to **refetch**; the cart is never asked to write directly.

## Notes

- **Checkout lives here, not in `orders`.** `POST /cart/checkout` is contractually filed under `Cart` and is the one call that empties this store. Moving it elsewhere would leave the local cart (and the header badge) stale after a completed order.
- **Every mutation replaces the local cart** with the authoritative API payload. The badge stays fresh because each action overwrites state; it is not incremented/decremented locally.
- **`badgeQuantity` is the only reactive coupling to the shell.** The shell never imports the cart store directly — it receives the accessor through the manifest. Changing this getter's contract breaks the header.
- **`wishlist` never writes through the cart store.** If you see a wishlist→cart code path that calls `upsertCartItem`, it is violating the conformist pattern.
- The module supports `en` and `it` locales, each loaded as its own chunk.
