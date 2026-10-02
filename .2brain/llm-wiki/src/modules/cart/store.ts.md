---
source: src/modules/cart/store.ts
sha256: 74effda65bfa2c97af144d59c08220e38a68eba94e7edc954972928d84a4b324
generated_at: 2026-10-02T14:59:26.705691+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/store.ts

## Purpose
Pinia store (`useCartStore`) that owns the authenticated user's shopping cart. Every mutating action fetches the full `CartResponse` from the API and **replaces** the local `cart` ref wholesale, so all derived getters (`cartItems`, `cartSummary`, `cartShipping`, badge values) stay consistent with server truth without client-side patching.

## Key elements

- **`useCartStore`** – the exported Pinia setup store (name `'cart'`).
- **`cart`** (ref) – single source of truth; always `CartResponse | undefined`.
- **`summarySeed`** (ref) – lightweight summary from `GET /cart/summary`, used only until a full cart load overwrites it.
- **Computed getters** – `cartItems`, `cartSummary`, `cartShipping`, `liveSummary` (freshest of the two), `badgeQuantity` (unit count, not line count), `badgeMoney` (total + currency as one object).
- **`fetchSummary`** – populates `summarySeed`; swallows 401 (guest → no cart) silently.
- **`fetchCart`** – populates `cart` via `fetchAny` (toggles `loading`).
- **Mutating actions** – `addCartItemAction`, `updateCartItem`, `setShippingMethod`, `removeCartItemAction`, `clearCartAction`. Each replaces `cart` and calls `mintCheckoutIdempotencyKey()`.
- **`checkout`** – sends the stored `Idempotency-Key` header; on success replaces `cart` with the known-empty shape from `emptyCart(currency)`. Retries after 5xx/network errors reuse the same key.
- **`mintCheckoutIdempotencyKey`** – generates a fresh `crypto.randomUUID()` for the next checkout attempt.
- **`emptyCart(currency)`** – returns a canonical zeroed `CartResponse` (FA33/FA37).
- **`useResetOnViewerChange`** – clears `cart`, `summarySeed`, and mints a new idempotency key when the viewer/account changes.

## Relationships

- **`src/modules/cart/index.ts`** – barrel file that re-exports `useCartStore` (and likely the type re-exports) so consumers import from the module path rather than reaching into `store.ts` directly.
- **`src/modules/cart/components/AddToCartButton.vue`** – component that calls `useCartStore().addCartItemAction(productId, quantity)` on user click; reads `loading` for button state.
- **`src/modules/cart/module.ts`** – module registration file that wires the store into the application's Pinia instance / feature-module graph.

## Notes

- **Replace, don't patch.** No action mutates `cart` item-by-item. If you add a new mutation, follow the same pattern: call the API, assign `cart.value = response.data`, then mint a new idempotency key.
- **Idempotency key lifecycle.** The key is minted at store init and re-minted after *any* cart-content change or a definitive checkout answer. A retry after a 5xx or network failure reuses the current key so the server can deduplicate.
- **`summarySeed` is a seed, not a cache.** Once `fetchCart` resolves, `liveSummary` always prefers `cart.value.summary`. The seed exists solely so a page-load header badge doesn't trigger a full cart fetch.
- **401 on `fetchSummary` is expected** for guests; it is caught and not surfaced. Do not add a toast or rethrow for that case.
- **`badgeQuantity` is total unit count** (`totalQuantity`), not the number of distinct product lines.
- **`emptyCart` takes `currency` as a parameter** rather than importing `shopCurrency` at the call site, keeping the helper pure and testable.
