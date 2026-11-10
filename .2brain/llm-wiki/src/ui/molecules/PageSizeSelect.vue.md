---
source: src/ui/molecules/PageSizeSelect.vue
sha256: 3f435515f35d6b9cebe67ef71179de9fb38f930be6502e265bbfd74651c4db78
signature: bcba032e2e22210f2e16b34693b4d28488b1c63d574f2f20c666846520033622
generated_at: 2026-11-10T06:28:43.037351+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/PageSizeSelect.vue

## Purpose

A reusable Vuetify `v-select` that lets a user pick how many rows per page to display. It centralises the page-size picker pattern so paginated lists don't each re-implement the dropdown, label, and item-mapping logic.

## Key elements

- **Props** — `label?: string` (custom select label; falls back to `t('generic.page-size')`) and `sizes?: number[]` (the offered row counts; defaults to `DEFAULT_PAGE_SIZES`).
- **`modelValue`** — `defineModel<number | undefined>({ required: true })`; the currently selected page size. Callers bind it directly to their search composable's `pageSize` ref.
- **Template** — renders a single `v-select` with `hide-details`, `data-test="page-size"`, and items built by mapping each number in `sizes` to `{ value, label: String(value) }`.

## Relationships

- **`src/ui/molecules/page-size-options.ts`** — provides `DEFAULT_PAGE_SIZES`, the fallback array of row counts used when the caller doesn't supply a `sizes` prop.

## Notes

- `modelValue` is typed `number | undefined` so it can slot into filter objects where `pageSize` is optional, even though every current caller initialises it to a concrete number.
- The `label` prop is expected to arrive already translated; the component only translates the *default* label itself.
- `item-title="label"` and `item-value="value"` on the `v-select` mean the visible text and the bound value come from the mapped object, not the raw number.
