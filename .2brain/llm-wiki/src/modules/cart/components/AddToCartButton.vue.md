---
source: src/modules/cart/components/AddToCartButton.vue
sha256: c0358cfcb46baad32b68df809b54c10b8a1db0631a50443b63c8b1dc820e1427
signature: 0a048831b651a7dae3736ba8a976c83320e936d20b7003387b3ae04b86518c40
generated_at: 2026-11-10T03:52:56.219372+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/AddToCartButton.vue

## Purpose

Renders the "add to cart" button for a product page. It is injected into the `product-actions` slot by the cart module's manifest, so the products module never imports cart code. On click it adds one unit of the product—via `POST /cart/items` for signed-in users or a local browser list for guests—and surfaces failures as an inline alert on the button rather than a toast.

## Key elements

- **`product` prop** — the `Product` to add; the sole external input.
- **`handleAddToCart()`** — click handler. Clears any prior error, then branches on `isAuth`: calls `addToGuestCart()` or `cartStore.addCartItem(product.id, 1)`.
- **`addToGuestCart()`** — calls `cartStore.addGuestItem`; reports a "guest cart full" error on failure.
- **`shelf` (computed)** — resolves the product's shelf state (`off-sale`, `preorder`, `backorder`, `out-of-stock`) via `shelfStateOf(product)`.
- **`label` (computed)** — i18n button text based on `shelf`.
- **`promise` (computed)** — backorder shipping text: formatted `restockDate` or "within N days" from `backorderPromiseDays`.
- **`useBlockingError()`** — per-button error state (`message`, `report`, `clear`); rendered by `<InlineErrorAlert>`.
- **`loading` (from `storeToRefs(cartStore)`)** — in-flight flag used to disable the button (double-click guard).
- **`isAuth` (from `storeToRefs(session)`)** — reactive signed-in flag that routes the add action.

## Relationships

- **`src/modules/cart/store.ts`** — Provides `useCartStore`. This component calls `addCartItem` (authenticated) and `addGuestItem` (guest), and reads the `loading` flag for its disable state.
- **`src/modules/cart/tests/add-to-cart-button.spec.ts`** — Unit-test spec for this component; exercises both the guest and authenticated add paths and the inline-error rendering.

## Notes

- The component is **slot-contributed** via the cart module manifest; the products module never imports it directly.
- `storeToRefs` is used (not plain destructuring) so `loading` and `isAuth` remain reactive after store re-creation.
- A **preorder** does *not* disable the button (bought now, ships later); **off-sale** and **out-of-stock** do. The final gate is the server's `product.buyable`.
- The `POST /cart/items` call is an additive "add one unit" operation; quantity is never derived from a local cart copy.
- Guest failure is limited to "cart full"; authenticated failure can be any API/network error—both land in the same `InlineErrorAlert`.
- The blocking-error pattern is documented in `docs/theory/request-flow.md`.
