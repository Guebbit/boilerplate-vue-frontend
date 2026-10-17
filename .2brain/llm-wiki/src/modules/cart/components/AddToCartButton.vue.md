---
source: src/modules/cart/components/AddToCartButton.vue
sha256: 46e43acba3c5c1979a5dcfaefd0da504585f447ac5579971a5e5585e70c52b10
generated_at: 2026-10-17T00:33:26.939288+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/AddToCartButton.vue

## Purpose

Renders the product page's "Add to Cart" button. It is contributed to the `product-actions` slot via the cart module's manifest so the products module never imports cart code directly. Routes the add action differently based on session state: signed-in users hit the server (`POST /cart`), guests grow a local browser list. Failures are surfaced inline via `InlineErrorAlert` rather than a toast.

## Key elements

- **`product` prop** (`Product`) — the single unit being added.
- **`mayShop`** (computed) — hides the entire button (not just disables it) for staff/admins who lack the `update Cart` permission; guests and shoppers see it.
- **`shelf`** (computed, via `shelfStateOf(product)`) — resolves to `'in-stock' | 'preorder' | 'off-sale' | 'out-of-stock'`; drives both the disabled state and the visible label.
- **`label`** (computed) — i18n string reflecting shelf state ("Preorder", "Out of stock", etc.).
- **`handleAddToCart`** — entry point on click. Clears any prior inline error, then delegates to the guest or authenticated path.
- **`addToGuestCart`** — calls `cartStore.addGuestItem(product.id, 1)`; reports an inline error if the guest list is full.
- **`handleAddToCart` (auth path)** — calls `cartStore.addCartItem(product.id, 1)` (a `POST` that grows an existing line); success fires a toast, failure populates the inline error.
- **`useBlockingError`** — provides `error`, `reportError`, `clearError` for the inline alert pattern.
- **`loading`** (reactive from cart store) — doubles as a click guard while a request is in flight.

## Relationships

- **`src/modules/cart/store.ts`** — provides `useCartStore`; this component reads `loading` (reactive) and calls `addCartItem` / `addGuestItem`. All cart mutations flow through that store; this component never builds a request itself.
- **`src/modules/cart/tests/add-to-cart-button.spec.ts`** — unit/integration test for this component; exercises the guest vs. auth paths, shelf-state disabling, and the inline-error path.

## Notes

- The button is **removed from the DOM** (`v-if="mayShop"`) for staff/admins, not merely disabled — they see no cart affordance at all.
- Preorders are **not** disabled: `disabled` is true only for `'off-sale'` and `'out-of-stock'`.
- `storeToRefs` is used (not destructuring) to keep `isAuth` and `loading` reactive; destructuring would break reactivity.
- The quantity is always `1` — there is no read-then-increment logic here; the server (or guest list) handles line-item growth.
- Success is a **toast** (`addMessage`); failure is **inline** (`InlineErrorAlert`). Do not add a toast for errors here.
