# docs/modules/wishlist.md

## Purpose

Documents the **wishlist** domain module: a single-screen, supporting-subdomain feature that manages a visitor's saved product references and provides the move-to-cart exit. The page serves as the quick-reference for the store surface, API contract, file layout, and the one inter-module dependency (to `cart`) that developers and AI assistants must respect.

## Key elements

- **`useWishlistStore`** (published from `store.ts`) — the Pinia store; the only writable surface is `items`.
- **Getters** — `savedProductIds`, `loading`; computed, read-only by construction.
- **Actions** — `isSaved`, `fetchWishlist`, `addToWishlist`, `removeFromWishlist`, `moveToCart`; every state mutation or API call lives here.
- **`views/Wishlist.vue`** — the single routed screen (`/:locale/wishlist`, route name `Wishlist`, `meta.access: auth`). Renders the store; holds no fetching logic.
- **`module.ts`** — the manifest the application loads directly: name, routes, navigation entry, response schemas, dependency edges, locales.
- **`response-schemas.ts`** — one Zod envelope per endpoint (`GetWishlistResponse`, `AddWishlistItemResponse`, `RemoveWishlistItemResponse`, `MoveWishlistItemToCartResponse`), toggled on/off by the domain's enable flag.
- **`index.ts`** — the public barrel; the only import surface a sibling module may use.
- **4 API endpoints** — `GET /wishlist`, `POST /wishlist`, `DELETE /wishlist/{id}`, `POST /wishlist/{id}/move-to-cart`.
- **Locales** — `en`, `it`; each loaded as its own chunk.

## Relationships

- **`docs/theory/layers.md`** — referenced as the explanatory document for `views/Wishlist.vue` in the Files table; defines the view-layer convention (reads store, renders, no fetching) that this screen follows.

The module also depends on `cart` (the `wishlist → cart` conformist edge exists solely so the header badge refetches after move-to-cart) and is depended on by `products` (the heart icon asks the wishlist store to write), but those are sibling module pages, not graph neighbors listed here.

## Notes

- The `wishlist → cart` edge is **conformist**, not customer-supplier: the cart is asked to *refetch itself*, never to write. That single post-move refetch is the entire justification for the edge.
- The reverse direction (`cart` reading `wishlist`) is deliberately absent; a `no-restricted-imports` lint failure would catch any import that closes the cycle before a runtime blank-screen bug could surface.
- Navigation entry and route `meta.access` are the single source of truth for the badge/icon and auth gate; the menu never restates access, preventing router/menu disagreement.
- Enabling or deleting the domain folder toggles all four Zod contract validations at once via the manifest — no per-endpoint opt-in.
- The module is classified **supporting** subdomain: business-specific but not a differentiator, so it is kept intentionally plain (one screen, one store, product references only).
