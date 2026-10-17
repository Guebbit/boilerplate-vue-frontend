---
source: src/ui/composables/use-any-filter-choice.ts
sha256: 0abcef7df5ac90c49c4823ff7333ab24086eeb8374554eeb23d5ffdbccc6e6d3
generated_at: 2026-10-17T01:56:44.668404+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-any-filter-choice.ts

## Purpose

A single-function composable that bridges Vuetify `v-select` (which requires `null` as the "any" item value) and the store's filters object (which carries `undefined` for unset filters). It exists as the one canonical place for this `null ⇄ undefined` sentinel mapping so that eleven admin filters don't each hand-roll it.

## Key elements

- **`useAnyFilterChoice<T>(get, set): WritableComputedRef<T | null>`** — Accepts a getter/setter pair for a `T | undefined` filter field and returns a writable computed that `v-model` binds directly to a `v-select`. On read it converts `undefined → null`; on write it converts `null → undefined`. No other exports.

## Relationships

No graph-neighbor files are recorded. The composable is consumed by admin "All / Any" filter `v-select` bindings (referenced in the module doc comment) and depends only on Vue's `computed` utility.

## Notes

- **Why `null`, not `undefined`:** Vuetify's `getObjectValueByPath` (helpers.js) falls back to the item's *title* string whenever the resolved value is `undefined`, so posting the value would send the translated label to the API. `null` passes through unchanged.
- The `??` operator (not `||`) is used for both directions, so falsy-but-valid filter values like `0` or `''` are preserved.
- The composable is intentionally stateless; it holds no internal reactive state of its own—only the pair of callbacks passed in.
