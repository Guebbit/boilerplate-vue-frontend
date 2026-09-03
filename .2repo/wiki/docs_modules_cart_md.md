# docs/modules/cart.md

## Purpose

The cart module owns the cart screen, the `cart` Pinia store, and the checkout flow. It sits in the `core` subdomain and is the central write target for add-to-cart, reorder, and move-to-cart actions across the app. Its public surface is a single barrel (`index.ts`) and the `useCartStore` export.

## Key elements

- **`store.ts`** — Pinia store. State: `cart`, `productTitles`. Getters: `cartItems`, `cartSummary`, `cartCount`, `badgeQuantity`, `loading`. Actions: `fetchSummary`, `fetchCart`, `titleOf`, `resolveTitles`, `checkout`, `reorder`, `upsertCartItem`, `updateCartItem`, `removeCartItem`, `clearCart`.
- **`domain/quantity.ts`** — Pure client-side rules over plain data (no store, no component, no axios).
- **`domain/index.ts`** — Domain barrel.
- **`index.ts`** — Public barrel; the only surface sibling modules may import.
- **`module.ts`** — Manifest declaring name, routes, navigation entries, response schemas, dependency edges, and locales.
- **`response-schemas.ts`** — Zod envelope per endpoint (8 total), paired with method + path pattern.
- **`routes.ts`** — Route record for `/:locale/cart` (auth-gated).
- **`locales/en.json` / `locales/it.json`** — Per-language translation chunks.
- **`views/Cart.vue`** — The single screen component.

## Relationships

- **`delivery`** (outgoing, *published-language*): Checkout mounts `ShippingSelector` from delivery. Cart never learns what a shipping rate is.
- **`orders`** (incoming, *customer-supplier*): The reorder button calls `useCartStore().reorder(orderId)`, which hits `POST /cart/reorder/{id}`.
- **`products`** (incoming, *customer-supplier*): Add-to-cart calls `upsertCartItem`, which hits `POST /cart`.
- **`wishlist`** (incoming, *conformist*): Move-to-cart calls a wishlist endpoint, then asks the cart store to refetch. Cart is never the writer here.
- **`docs/theory/domain-layer.md`** — Explains `domain/quantity.ts` and `domain/index.ts`.
- **`docs/theory/strategic-ddd.md`** — Explains the `index.ts` barrel and the core-subdomain classification.
- **`docs/theory/modules.md`** — Explains `module.ts` and how the shell consumes the manifest.
- **`docs/theory/sitemap.md`** — Explains `routes.ts` and localised route splicing.
- **`docs/api/openapi-workflow.md`** — Explains `response-schemas.ts` and Zod envelope registration.
- **`docs/tools/i18n.md`** — Explains the per-locale JSON chunk loading.
- **`docs/tools/observability.md`** — Cart emits no client-side analytics events; checkout outcomes are emitted by the backend handler.
- **`docs/tools/component-testing.md`** — Cypress suites (`cart.cy.ts`, `a11y.cy.ts`, `cart.visual.cy.ts`) test the screen in a browser.

## Notes

- **`badgeQuantity` is load-bearing.** The shell header reads it (and `badgeTotal`) through the manifest as a badge/detail accessor. Changing either name or shape breaks the header without any import in the shell's code.
- **Checkout lives in the cart store, not the orders store.** The contract file is under `Cart` (`POST /cart/checkout`), and it is the one call that empties the cart. Moving it elsewhere would leave a completed order still visible in the header badge.
- **Badge seeding is cheap.** On session appearance the shell calls `GET /cart/summary` — an endpoint designed to return a count without pulling the full cart. All later mutations refresh the badge via the store's authoritative response payloads.
- **No client-side analytics events.** Every checkout outcome is emitted by the backend from the deciding handler; a request that never reaches the API is already a failed Faro span.
- **The `pinned` navigation entry** means the cart label and badge sit beside the account menu at every viewport width, not inside the account dropdown.
