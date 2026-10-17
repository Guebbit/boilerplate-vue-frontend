---
source: src/modules/inventory/composables/use-product-picker.ts
sha256: 9ffd2a9f12f8c88ecbcc71da8c3df066c3c2a34c9b2d61dbe2aef68d8a6a3beb
generated_at: 2026-10-17T00:58:41.716114+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/composables/use-product-picker.ts

## Purpose

A Vue composable that provides search-as-you-type product selection for inventory forms. It exists because the products store's `listProducts()` cache only holds the first page (~10 items), making later products unreachable in a plain `v-select`. Instead, it queries `POST /products/search` on each keystroke (debounced) to return up to 20 matching results.

## Key elements

- **`useProductPicker()`** — Returns `{ query, options, pin }` for binding to a `v-autocomplete`. `query` is the search text (ref), `options` is a computed list of `ProductPickerOption`, and `pin` is the pre-selection helper.
- **`pin(id)`** — Ensures a product already selected from outside the search (e.g. a history button) remains visible in the options list. Fetches by id if the current search page doesn't contain it; a falsy id clears the pin.
- **`useProductPickerPin(getSelected, pin)`** — Convenience wrapper that wires `watch(getSelected, pin, { immediate: true })` so the pin stays in sync with a `v-model` without the caller writing the watch manually.
- **`ProductPickerOption`** — Interface (`{ value: string; title: string }`) shaping each row the `v-autocomplete` renders.
- **Constants** — `PAGE_SIZE = 20` (results per search call), `DEBOUNCE_MS = 300` (keystroke hold-off).

## Relationships

- **`StockMovementForm.vue`** — Primary consumer; binds `query`/`options` to its product `v-autocomplete` and calls `pin` (or `useProductPickerPin`) to keep a pre-filled product resolvable.
- **`MovementLedger.vue`** — Consumes the same composable for its inline product-picker column.
- **`use-product-picker.spec.ts`** — Unit tests covering search debouncing, option computation, and the `pin` fetch/clear lifecycle.

## Notes

- Failed searches are swallowed (`.catch(() => undefined)`); the previous result page stays visible. No error UI is surfaced from this composable — the caller's form-level validation is expected to catch real problems.
- `pin` is idempotent per id: re-pinning the same id is a no-op, and pinning an id already present in `results` simply clears the pin without an extra fetch.
- The `watch` on `query` uses `{ immediate: true }`, so an initial (possibly empty) search fires as soon as the composable is created. An empty query sends `text: undefined` to the API.
- `useProductPickerPin` accepts a getter function rather than a ref, so it works with both plain refs and computed-derived values like `() => form.value.productId`.
