---
source: tests/unit/ui/sort-select.spec.ts
sha256: f7381d57640e74890f622200f94fc3a94ac8f646fe4c155c7658ab764de13421
signature: 6d9a741b0021714858277b3aa88750a6b3c920abd5710513f25455f2e9c4a89d
generated_at: 2026-11-10T08:29:09.347730+00:00
model: ollama:qwen3.8:27b
---

# tests/unit/ui/sort-select.spec.ts

## Purpose

Unit tests for the `SortSelect.vue` component, verifying that it prepends a default-order option (value `null`) before caller-supplied options, and that `v-model` binding (inbound `modelValue` / outbound `update:modelValue`) works correctly through Vuetify's `VSelect`.

## Key elements

- **`mountSelect(modelValue?)`** — helper that mounts `SortSelect` with a fixed label, one sample option (`-price` / "Price: high to low"), and the Vuetify plugin registered globally. Defaults `modelValue` to `null`.
- **`describe('SortSelect')`** — contains two tests:
  - Asserts the `items` prop forwarded to `VSelect` is `[ {value: null, title: 'Newest first'}, …caller options ]`.
  - Asserts `modelValue` is passed through to `VSelect`, and that emitting `update:modelValue` on the inner select produces a matching `update:modelValue` emission on `SortSelect`.

## Relationships

No graph neighbors are documented for this file.

## Notes

- The default order uses `null`, **not** `undefined` — this is intentional and asserted explicitly. Callers should treat `null` as "no sort applied."
- Tests interact with `VSelect` internals via `wrapper.findComponent(VSelect)` and `select.vm.$emit(...)`, so they rely on Vuetify's component contract staying stable.
