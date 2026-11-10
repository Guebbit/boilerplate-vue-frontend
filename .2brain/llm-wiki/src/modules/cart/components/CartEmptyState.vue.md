---
source: src/modules/cart/components/CartEmptyState.vue
sha256: 1ee3b830076f7b64da95f3a424e7d2ae5b8ac2cf19b242bf7a3907dc97683327
signature: cd5092beeeeb77aec2d0b7515fcc68e2b2558b1aef4529c4a52d150292b296e9
generated_at: 2026-11-10T03:53:03.437506+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/components/CartEmptyState.vue

## Purpose
Shared empty-cart display for both the guest and signed-in cart views. It shows a cart icon, an i18n "your cart is empty" message, and a button back to the catalogue. Because the wording is identical for both carts, this component is prop-free and can be dropped into either without configuration.

## Key elements
- **`<script setup>` block** – no props, no emits; imports `ListEmptyState`, `useI18n`, the `ShoppingCart` icon, and `routerLinkI18n`.
- **`ListEmptyState`** (from `@/ui/molecules/ListEmptyState.vue`) – generic "no items" layout; receives `:title` and `:icon` props.
- **`#actions` slot** – contains a Vuetify `v-btn` (color `primary`) whose `:to` is `routerLinkI18n({ name: 'ProductsList' })`, providing an i18n-aware navigation link to the catalogue page.
- **`t('cart-page.empty-cart')`** / **`t('cart-page.button-go-to-products')`** – translation keys under the `cart-page` namespace.

## Relationships
- **`GuestCart.vue`** – imports this component and renders it when the guest cart has no items, replacing the product list.
- **`SignedInCart.vue`** – same usage: renders this component as the empty-state branch, making the signed-in and guest carts visually identical when empty.

## Notes
- The navigation target is the named route `ProductsList`, wrapped in `routerLinkI18n` so the URL picks up the active locale prefix. Adding a new catalogue route name here requires updating both carts' empty-state expectations.
- Because the component takes no props, any future need to differentiate the empty message between guest and signed-in flows would require either adding a prop or forking the component.
