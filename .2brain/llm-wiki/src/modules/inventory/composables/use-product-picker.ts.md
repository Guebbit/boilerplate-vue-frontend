---
source: src/modules/inventory/composables/use-product-picker.ts
sha256: 1d5f6b5d0f1b8f988c4100e6d8275349586febc0d721a9da11aee1e54cff9480
signature: 605214c5e74ba7d8f5d87ac4312d1f1c3a64815637bdd4847f11816bc146a3de
generated_at: 2026-11-10T04:31:31.481052+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/composables/use-product-picker.ts

## Purpose

Composable that provides search-as-you-type product options for inventory pickers. It bypasses the products store's `listProducts()` cache (which only holds the first page) and instead calls `POST /products/search` directly, so products beyond the first ~10 items remain selectable.

## Key elements

- **`ProductPickerOption`** — interface for a single `v-autocomplete` item: `{ value: string; title: string }`.
- **`useProductPicker()`** — the main composable. Returns:
  - `query` (`ref<string>`) — bind to the picker's `search` input; a `watch` (immediate) triggers the debounced search.
  - `options` (`computed<ProductPickerOption[]>`) — the current search page, with the pinned product prepended if it is absent from results.
  - `pin(id)` — fetches a single product by id (if not already in the current results) so an externally-set `v-model` value stays displayable; passing `undefined` clears the pin.
- **`useProductPickerPin(getSelected, pin)`** — convenience wrapper that wires `watch(getSelected, pin, { immediate: true })` so a call site can auto-sync its form's bound id to the picker's pin without writing the `watch` manually.
- **Constants** — `PAGE_SIZE = 20` (rows per search page), `DEBOUNCE_MS = 300` (lodash-es debounce window on `runSearch`).

## Relationships

- **`StockMovementForm.vue`** — primary consumer; binds `query`/`options` to its product `v-autocomplete` and uses `useProductPickerPin` to keep the form's `productId` resolvable.
- **`MovementLedger.vue`** — secondary consumer of the same picker pattern (see module docstring).
- **`use-product-picker.spec.ts`** — unit tests covering search debouncing, option mapping, and pin behavior.
- **`@api` (`searchProducts`)** — the HTTP call backing both the typed search and the single-id pin fetch.

## Notes

- Both search and pin `.catch(() => undefined)` — failures are intentionally swallowed. A failed search leaves the previous page visible; a failed pin simply stays unresolved. Callers are expected to surface real errors at their own submit step.
- `watch(query, …, { immediate: true })` means the picker fires an initial search (with empty text) as soon as it is created, not only after the first keystroke.
- `pin` is idempotent for an already-present id: if the id is already in `results` it just clears the pin and does no fetch. A repeated call with the same non-present id also short-circuits (`pinned.value?.id === id`).
- `options` always maps to `{ value: product.id, title: product.title }` — the `v-autocomplete` `value-key` must be `value`, not `id`.
