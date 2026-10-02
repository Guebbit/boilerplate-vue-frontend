---
source: src/modules/cart/components/AddToCartButton.vue
sha256: a046951f2084cb1c1c1012906281a17624b7c8fb4b5027e784e3dd83a81f7a73
generated_at: 2026-10-02T14:56:41.085511+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/AddToCartButton.vue

## Purpose

The product-page "add to cart" button, rendered inside the products module's `product-actions` slot via this module's manifest. The products module owns the page and never imports cart code directly; this component is the cart module's only visible surface on that page. A failed request blocks the button in place with an inline alert rather than raising a global toast.

## Key elements

- **`handleAddToCart`** — Clears any prior error, calls `cartStore.addCartItem(product.id, 1)`, shows a success toast on resolve, or reports the error via `useBlockingError` on reject. Always adds exactly one unit; never reads a local cart quantity.
- **`outOfStock`** (computed) — `product.available === 0`. An absent or `null` `available` field is treated as *unconstrained*, so legacy rows don't render as sold out.
- **`loading`** — Reactive in-flight flag from the cart store (via `storeToRefs`). Acts as the button's double-click guard.
- **`isAuth`** — From `useSessionStore`; a guest (not signed in) gets a disabled button with no cart to write to.
- **`error` / `reportError` / `clearError`** — Destructured from `useBlockingError`; drives the `InlineErrorAlert` shown beneath the button.
- **`addMessage`** — From `@guebbit/vue-toolkit` notifications store; fires the one-time success toast.

## Relationships

- **`src/modules/cart/store.ts`** — The component calls `cartStore.addCartItem(product.id, 1)` to perform the API write and reads `cartStore.loading` (via `storeToRefs`) to disable the button while the request is in flight. This is the sole interaction with the store; the component never reads cart line-items or quantities locally.

## Notes

- **Slot-based composition:** The products module never imports this file. The cart module's manifest injects it into `product-actions`. If the button "disappears," check the manifest wiring, not the products page.
- **`outOfStock` is strict `=== 0`:** Do not "simplify" to `!product.available`; that would treat `undefined` (rows predating the column) as out of stock.
- **Error is inline, success is a toast:** Deliberate asymmetry. Errors block the single action in place; success is a transient acknowledgment. Don't swap them.
- **`loading` is the double-click guard:** There is no local `submitting` ref. If you add a second async action to this button, share the store's `loading` flag or add a second one—don't remove the existing guard.
