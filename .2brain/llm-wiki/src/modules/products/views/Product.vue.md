---
source: src/modules/products/views/Product.vue
sha256: 19959c8c309830a5f5fdf796c3a0fcd05abd4581e7fec70a60833fe5afc4f656
generated_at: 2026-10-17T01:35:24.642569+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/Product.vue

## Purpose

Public product detail page (`ProductTargetPage`). Renders a fetched product record with hero, stat cards, detail fields, and an aside; hosts the `product-actions` slot so other modules can inject storefront visitor actions (add to cart, toggle wishlist) without this page knowing who they are.

## Key elements

- **`watchProduct(() => id, { staleTime: 0, onError })`** — fetches/refreshes the product whenever the route `id` (or locale) changes. `staleTime: 0` forces a refetch on every open (stale-while-revalidate), because this page is where a stock number is read.
- **`stockLabel` (computed)** — resolves the stock stat text through `shelfStateOf`: `off-sale` → `preorder` (shows `releaseDate`) → `out-of-stock` → `low-stock` → `in-stock` (shows exact `available` count only for stock readers; everyone else gets the two boolean flags).
- **`heroTitle` / `heroDescription` / `productStatus` (computed)** — display helpers with graceful fallbacks (route id while loading, empty-value glyph when blank).
- **`productActions = useSlot('product-actions')`** — dynamic slot; each contributed component receives `:product="currentProduct"` and is rendered via `<component :is>`.
- **`onMissingRecord`** — from `useMissingRecord()`; routes to the Error page on 404/403 rather than leaving placeholders.
- **Analytics tracking** — a `watch` on `id` fires `trackBrowsing({ event: 'product_viewed', productId })` once per product, gated by the analytics-consent store.
- **Auth gating** — `isAuth` (from session store) shows a "sign in" hint to guests; `session.can('update', 'Product')` gates the "Go to edit" button.
- **Template** — composed of `ItemDetailLayout` → hero / stats / detail card / aside / actions slots, using `CardMaterialStat`, `ItemDetailField`, `CardInfo`, and `CardDetail` organisms.

## Relationships

- **`src/modules/products/store.ts`** — consumes `useProductsStore()` for `watchProduct` (fetch action) and `currentProduct` (reactive record via `storeToRefs`).
- **`src/modules/products/domain/index.ts`** — imports `shelfStateOf` to derive the stock display state (`off-sale` | `preorder` | `in-stock`).
- **`src/modules/products/domain/shelf-state.ts`** — underlying implementation of `shelfStateOf`; the view depends on its return values to branch the stock label.
- **`src/modules/products/tests/product-view.spec.ts`** — integration/contract tests for this component's rendering, slot behaviour, and fallback states.
- **`src/modules/products/tests/product-fresh-stock.spec.ts`** — tests the stock-label logic (off-sale precedence, preorder date, exact-count visibility) exercised through this view.

## Notes

- Two `<script>` blocks are intentional: the first declares the stable component `name` (required for `<KeepAlive>` and devtools alongside `<script setup>`).
- `staleTime: 0` is a deliberate choice distinct from the products list (which uses a five-minute cache); the detail page must always show fresh stock.
- The `product-actions` slot is **passive**: this page never imports or names the action components. Adding a new action means registering it in the slot elsewhere, not editing this file.
- Stock visibility is role-aware: the exact `available` number is only rendered for "stock readers"; all other visitors see only the boolean-derived labels so a competitor cannot scrape shelf counts.
- All i18n keys are namespaced under `product-target-page.*` (with shared `generic.*` for enabled/disabled and loading-state strings).
