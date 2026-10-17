---
source: tests/unit/ui/sort-select.spec.ts
sha256: f7381d57640e74890f622200f94fc3a94ac8f646fe4c155c7658ab764de13421
generated_at: 2026-10-17T02:47:22.047506+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/sort-select.spec.ts

## Purpose

Unit tests for the `SortSelect.vue` component. Verifies two contracts: (1) the component prepends a default-order option (value `null`) before any caller-supplied options in the items array, and (2) `v-model` is wired correctly through Vuetify's `VSelect` — both reading the incoming `modelValue` and emitting `update:modelValue` on change.

## Key elements

- **`mountSelect(modelValue?)`** — helper that mounts `SortSelect` with a fixed label, a `defaultLabel` of "Newest first", one sample option (`-price`), and registers the project's Vuetify plugin.
- **`describe('SortSelect')` / `it('offers the default order first…')`** — asserts the `items` prop passed to the inner `VSelect` is `[{ value: null, title: 'Newest first' }, { value: '-price', … }]` in that order.
- **`it('forwards the model to the select, and its change back out')`** — confirms the `modelValue` prop reaches `VSelect`, and that emitting `update:modelValue` on `VSelect` is re-emitted by `SortSelect` to its parent.

## Relationships

No graph neighbors are registered. The file directly imports `@/ui/molecules/SortSelect.vue` (the component under test) and `@/ui/vuetify` (project Vuetify setup), but no other files in the dependency graph reference this spec.

## Notes

- The default option's value is **`null`**, not `undefined`. The file's header comment calls this out explicitly; tests assert `null` via `toEqual`.
- The component is tested through its public `VSelect` child rather than by asserting on DOM text, which keeps the tests coupled to the Vuetify integration rather than to markup.
- `mountSelect` defaults `modelValue` to `null`, matching the "no sort selected" state.
