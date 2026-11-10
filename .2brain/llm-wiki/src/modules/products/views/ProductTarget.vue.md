---
source: src/modules/products/views/ProductTarget.vue
sha256: b087332dba2402b3645fb0b17c22174dff3afeaad17443a98cadc81de2fd65ed
signature: 3a9710e1ca3568a07fd08dddb0783fb2aac96a82d11e8a0bcbf88d189b33fa8b
generated_at: 2026-11-10T05:34:46.019985+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/views/ProductTarget.vue

## Purpose

Public product detail page. It fetches and renders a single product record by route-provided `id`, displays price/stock/status stats and a full field grid, and hosts the `product-actions` slot where other modules contribute visitor write actions (add to cart, wishlist). It is the canonical place where a stock number is read, so it always refetches.

## Key elements

- **`name: 'ProductTargetPage'`** — declared in a separate `<script>` block (required for devtools/`KeepAlive` alongside `<script setup>`).
- **`heroTitle` / `heroDescription` / `productStatus`** (computed) — display values with graceful fallbacks (loaded record → route `id` → generic label).
- **`watchProduct(() => id, { staleTime: 0, onError: onMissingRecord })`** — fetch/re-fetch the product; `staleTime: 0` forces a network read on every open (stale-while-revalidate: cached copy renders immediately, fresh copy swaps in).
- **`trackBrowsing`** (watch on `id`) — fires `product_viewed` analytics event once per product opened; no-op until visitor consents.
- **`stockLabel`** (computed) — resolves the stock badge via `shelfStateOf`: off-sale → preorder (release date) → backorder (restock date or `backorderPromiseDays`) → out-of-stock → low-stock → exact `available` count (visible only to stock-reader role).
- **`asideFields`** (computed) — `createdAt` / `updatedAt` rows for the aside card.
- **`productActions`** (`useSlot('product-actions')`) — this page owns the slot; it renders each contributed component with the product and never knows what they are.
- **Template** — composed from `ItemDetailLayout`, `ItemDetailHero`, `CardMaterialStat` ×4, `CardDetail` with `ItemDetailField` rows, and `RecordAsideCard`; auth gate shows a "sign in to buy" hint to guests.

## Relationships

- **`src/modules/products/store.ts`** — imports `useProductsStore`; consumes `watchProduct` (fetch action) and `currentProduct` (reactive record via `storeToRefs`).
- **`src/modules/products/domain/index.ts`** — imports `shelfStateOf` to derive the shelf state used by `stockLabel`.
- **`src/modules/products/domain/shelf-state.ts`** — the underlying domain function re-exported through the domain index; classifies a product as off-sale / preorder / backorder / in-stock.
- **`src/modules/products/tests/product-fresh-stock.spec.ts`** — exercises the stock-label and fresh-refetch behavior of this view.
- **`src/modules/products/tests/product-view.spec.ts`** — renders the page and asserts the stat/field layout and slot wiring.

## Notes

- The component **name** must live in a plain `<script>` block; `<script setup>` cannot set it. Forgetting this breaks `<KeepAlive>` matching and devtools labels.
- `staleTime: 0` is intentional: this page is where a stock number is read, so it never trusts the list-level 5-minute cache.
- Stock visibility is **role-gated**: only a stock-reader role sees the numeric `available` value; everyone else sees only the two boolean flags (`inStock`, `lowStock`). Do not expose `available` to the general template.
- The `product-actions` slot is **owned here, populated elsewhere**. Other modules (shop, wishlist) register components into it; this file never imports or hard-codes those components.
- The `watchProduct` trigger also re-fires on **locale change** because the store scopes its cache by locale and the API localizes `title`/`description`.
