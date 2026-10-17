---
source: src/modules/wishlist/components/WishlistToggle.vue
sha256: 476719fbc3aaad89310035c8dda5fea74367c6162dc34fa03906aee42ea3c56a
generated_at: 2026-10-17T01:54:07.544407+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/components/WishlistToggle.vue

## Purpose
A heart-shaped toggle button that saves or unsaves a product to/from the user's wishlist. It is contributed to the `product-actions` slot by the wishlist module's manifest, so the products module never imports it directly. Renders nothing for guests; a failed toggle disables this one button in place.

## Key elements
- **`product` prop** — the `Product` whose wishlist membership is toggled.
- **`handleToggle`** — calls `addToWishlist` or `removeFromWishlist` on the store depending on current state; a rejection is passed to `useBlockingError.report`.
- **`onMounted` hook** — fires `wishlist.ensureWishlist()` (fire-and-forget) when the user is authed, so the component knows what is already saved.
- **Template** — a `v-btn` with a `Heart` icon; the icon fill and button color reflect saved/unsaved state. An `InlineErrorAlert` appears below the button on failure. The whole block is gated by `v-if="isAuth"`.
- **`loading` (from store)** — disables the button while a toggle request is in flight (double-click guard).

## Relationships
- **`src/modules/wishlist/store.ts`** — Source of all wishlist state and actions (`isSaved`, `addToWishlist`, `removeFromWishlist`, `ensureWishlist`, `loading`). This component is its primary UI consumer.
- **`src/modules/wishlist/tests/wishlist-toggle.spec.ts`** — Unit/integration tests for this component's render logic and toggle behavior.

## Notes
- The double-click guard (`loading`) lives in the shared store, not locally, so concurrent toggles on different hearts are serialized.
- `ensureWishlist` in `onMounted` is intentionally fire-and-forget and shared: in a product grid every heart card mounts the same single read.
- Success feedback is purely visual (heart fill + button color); no toast or route change. Failure is scoped to this button via `useBlockingError`, not a global error boundary.
- The component is designed to be slotted into a page owned by the products module; it must not be imported there directly.
