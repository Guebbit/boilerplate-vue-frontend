---
source: src/ui/molecules/PageSizeSelect.vue
sha256: d9fc4ec359684811845569b9ff77c8841843bcbe62393bd5a8133cf008968348
generated_at: 2026-10-17T01:57:54.215679+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/PageSizeSelect.vue

## Purpose

A single-purpose Vuetify `v-select` picker that lets users choose the number of rows per page in any paginated list. It centralises the repeated "rows-per-page" dropdown so callers only pass a translated label and (optionally) a custom set of sizes, while the `v-model` binds directly to a search composable's `pageSize` ref.

## Key elements

- **`label`** (prop, `string`, required) – Already-translated select label. No i18n is performed inside this component.
- **`sizes`** (prop, `number[]`, optional) – The row-count options offered. Defaults to `DEFAULT_PAGE_SIZES` imported from `page-size-options.ts`.
- **`modelValue`** (v-model, `number | undefined`) – Two-way bound to the current page size. Typed as `number | undefined` to accommodate callers whose filters type makes the field optional, though current callers always initialise it.
- **Template** – Renders one `<v-select>` with `items` mapped from `sizes` (each entry becomes `{ value, label: String(value) }`). Exposes `data-test="page-size"` for automated tests. Uses `hide-details` to suppress Vuetify's default helper text.

## Relationships

- **`src/ui/molecules/page-size-options.ts`** – Imports `DEFAULT_PAGE_SIZES` as the fallback for the `sizes` prop. This is the sole import and dependency of the component.

## Notes

- The component intentionally performs **no i18n** itself; the `label` prop must arrive pre-translated (same convention as `ListPagination`'s `ariaLabel`).
- `modelValue` is `required: true` despite the `| undefined` type — callers must pass the prop, but its value may be `undefined` at runtime.
- The `data-test="page-size"` attribute is the contract for E2E/test selectors; changing it will break test locators.
