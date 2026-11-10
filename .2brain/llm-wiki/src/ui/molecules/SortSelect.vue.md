---
source: src/ui/molecules/SortSelect.vue
sha256: c3b7c2c817d73b068f038ab967620d603bedb248611169a8ff46c7db640e8e43
signature: e99f5da74455a21982a267d26337fe8b44e9864a1e1ccf82b5f4b019c4cd4fa5
generated_at: 2026-11-10T06:28:55.857105+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/SortSelect.vue

## Purpose

A "Sort by" dropdown for card-based list views. It wraps a Vuetify `v-select` over a small set of server-side sort tokens (e.g. `-price`, `title`), always offering a leading "default order" entry. Intended as the card-list counterpart to table-header sorting.

## Key elements

- **Props** (`label`, `defaultLabel`, `options`) — all labels are expected to arrive already translated; the component performs no i18n internally. `options` is an array of `{ value: string; title: string }` where `value` is the API sort token.
- **`modelValue`** (`defineModel<string | null>`) — two-way binding; `null` means "use the default order". Defaults to `null`.
- **`items`** (computed) — prepends `{ value: null, title: defaultLabel }` to the caller-supplied `options`, producing the full list fed to `v-select`.
- **Template** — a single `v-select` with `item-title="title"`, `item-value="value"`, `hide-details`, and `data-test="sort-select"`.

## Relationships

No graph neighbors recorded.

## Notes

- `null` (not `undefined`) is the sentinel for the default order. Vuetify treats an `undefined` item value as "fall back to the title", so `null` is deliberately used to avoid that ambiguity.
- This component is scoped to card-based lists; table views sort via their column headers and do not use it.
- All human-readable strings (`label`, `defaultLabel`, option `title`s) are the caller's responsibility to translate before passing in.
