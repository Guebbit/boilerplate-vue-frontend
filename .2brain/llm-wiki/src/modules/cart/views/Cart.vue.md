---
source: src/modules/cart/views/Cart.vue
sha256: c1446648e06101d2d75111a177e2808c9b9e0ca1737845ae412c837368329516
signature: 431690debe7319494573096e9d733c353ce592aee1091efe6d922b530828cd93
generated_at: 2026-11-10T04:13:51.902180+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/views/Cart.vue

## Purpose

The single view component behind the cart route. Its only job is to check the session store's `isAuth` flag and render the appropriate cart screen — `SignedInCart` for authenticated users (shipping, payment, checkout) or `GuestCart` for anonymous visitors (browser-stored list). It exists so both experiences share one route URL without leaking account-specific UI to guests.

## Key elements

- **`export default { name: 'CartPage' }`** (named `<script>` block) — Provides a stable component name for Vue DevTools and `<KeepAlive>` caching, since `<script setup>` cannot declare `name` itself.
- **`isAuth`** (ref from `storeToRefs(useSessionStore())`) — The single reactive boolean that drives the `v-if` / `v-else` split in the template.
- **Template** — Two conditional branches: `<SignedInCart v-if="isAuth" />` and `<GuestCart v-else />`. No other markup, slots, or props.

## Relationships

- **`src/modules/cart/components/SignedInCart.vue`** — Rendered exclusively when `isAuth` is truthy. This file owns the conditional; `SignedInCart` receives no props from here.
- **`src/modules/cart/components/GuestCart.vue`** — Rendered exclusively when `isAuth` is falsy. Likewise receives no props.
- **`src/modules/cart/tests/cart-route-view.spec.ts`** — Unit/integration test that exercises this component's branching logic.

## Notes

- This component is intentionally prop-less and state-less beyond the store ref; all cart logic lives in the two child components.
- The `storeToRefs` call (rather than destructuring the store) preserves reactivity of `isAuth` so the template re-evaluates on auth state changes.
- Because it is just a two-way conditional, any shared layout (header, page wrapper) is expected to come from a parent layout or router-view wrapper, not from this file.
