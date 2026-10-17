---
source: src/modules/cart/views/CartEntry.vue
sha256: 5e0402aa78eb7b61da125ff58111f1b99783c5e513a88ba9bd07deafa754ab42
generated_at: 2026-10-17T00:45:40.192916+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/views/CartEntry.vue

## Purpose

The cart route's top-level screen. It reads the session's auth flag and renders exactly one of two cart experiences — a full signed-in cart or a lightweight guest cart — behind a single URL.

## Key elements

- **`isAuth`** (ref) — destructured from `useSessionStore()` via `storeToRefs`; the single boolean that drives the template branch.
- **Template** — a two-way `v-if` / `v-else`: `<Cart>` when authenticated, `<GuestCart>` otherwise. No additional state, computed properties, or lifecycle hooks.

## Relationships

- **`views/Cart.vue`** — rendered (and owned) when `isAuth` is `true`; provides the full signed-in cart with shipping, addresses, payment, and checkout.
- **`components/GuestCart.vue`** — rendered when `isAuth` is `false`; a self-contained, browser-stored cart list with no account features.
- **`tests/cart-entry-view.spec.ts`** — unit-test spec that exercises the auth/dispatch logic of this component.

## Notes

- The component is intentionally stateless and has no props; it is purely a dispatcher. Any change to which cart shows requires only this file.
- Uses `storeToRefs` (Pinia-specific) rather than plain `toRefs` to keep the reactive link to the store — do not "simplify" to a one-off read or the branch will stop updating on auth changes.
- The module-level JSDoc in the `<script>` block is the canonical explanation of *why* two separate screens exist; keep it in sync if the guest vs. signed-in feature set changes.
