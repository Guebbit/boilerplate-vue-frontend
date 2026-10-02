---
source: src/modules/products/views/Product.vue
sha256: 08b1fd8b65f801c0c5c220394228e1f161b1ce8d8995b925496d4fde889b42fc
generated_at: 2026-10-02T15:40:12.499187+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/Product.vue

## Purpose

Public product detail page component. It fetches a product by route-provided `id` via the products store, renders the full record (hero image, price, stock, status, timestamps, description), and exposes a `product-actions` slot so other modules can inject visitor-write buttons (add-to-cart, wishlist) without this page knowing their identity.

## Key elements

- **`defineProps<{ id?: string }>()`** – Route-supplied product identifier; drives the watch/fetch cycle.
- **`watchProduct(() => id, { onError: onMissingRecord })`** – Re-fetches on route-id *and* locale change (store cache is scoped by locale). On 404/403, delegates to `useMissingRecord`.
- **`heroTitle` / `heroDescription` / `productStatus` (computed)** – Fallback-chained display values: product field → route id → i18n generic label.
- **`outOfStock` (computed)** – `currentProduct.available === 0`; an absent `stock` field is treated as *unconstrained*, not sold out.
- **`productActions` via `useSlot('product-actions')`** – Renders dynamically-provided action components, passing each the loaded product. Only rendered when `currentProduct` exists.
- **`isAuth` / `session.can('update', 'Product')`** – Gates the "sign-in prompt" text for guests and the "Go to edit" button for authorized users.
- **Template slots on `ItemDetailLayout`** – `#hero`, `#stats`, `#aside`, `#actions` drive the page layout using shared organisms (`ItemDetailHero`, `CardMaterialStat`, `CardDetail`, `CardInfo`, `ItemDetailField`).
- **Formatters** – `formatCurrency`, `formatDateTime`, `formatText`, `formatFlag` from the infrastructure utils normalise raw API values for display.

## Relationships

No graph neighbors are registered for this file.

## Notes

- The component name in the Options-API block is `ProductTargetPage`, matching the i18n key prefix `product-target-page.*` used throughout the template.
- `outOfStock` intentionally checks only `available === 0` (not falsy/undefined) so legacy rows missing the column don't render as "sold out"—mirrors the checkout rule.
- The "Go to edit" button is the only write-path action owned by *this* page; all other visitor writes arrive through the slot and are invisible to the template logic.
- `routerLinkI18n` is used for all navigation links to keep route names locale-aware.
