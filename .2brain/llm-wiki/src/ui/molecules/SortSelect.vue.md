---
source: src/ui/molecules/SortSelect.vue
sha256: c3b7c2c817d73b068f038ab967620d603bedb248611169a8ff46c7db640e8e43
generated_at: 2026-10-17T01:58:00.399922+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/SortSelect.vue

## Purpose

A "Sort by" dropdown for card-based list views. Wraps a Vuetify `v-select` around a small set of server-side sort tokens (e.g. `-price`, `title`) and prepends a "default order" entry. Tables handle sorting via column headers instead; this component exists specifically for the card layout.

## Key elements

- **Props** (`label`, `defaultLabel`, `options`) — all labels arrive already translated; `options` is an array of `{ value: string; title: string }` where `value` is the API sort token.
- **`modelValue`** — a `defineModel<string | null>()` (default `null`). `null` represents "default order"; any other string is the chosen sort token.
- **`items`** (computed) — prepends `{ value: null, title: defaultLabel }` to the caller-supplied `options`, producing the final list rendered by the select.
- **Template** — a single `<v-select>` bound to the above, with `data-test="sort-select"` and `hide-details`.

## Notes

- **`null` instead of `undefined` for "no sort":** Vuetify interprets an `undefined` item value as "fall back to the title string," so the default entry deliberately uses `null`. Consumers should treat `null` from the model as "send no sort param."
- **No i18n inside this component.** The parent is responsible for translating `label`, `defaultLabel`, and every `option.title` before passing them in.
- **Not intended for table views.** The module doc comment explicitly scopes it to card lists; a table sorts from its own column headers.
