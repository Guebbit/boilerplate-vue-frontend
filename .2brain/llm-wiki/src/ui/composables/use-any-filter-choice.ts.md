---
source: src/ui/composables/use-any-filter-choice.ts
sha256: 0abcef7df5ac90c49c4823ff7333ab24086eeb8374554eeb23d5ffdbccc6e6d3
signature: e983788587698356bce43a8733e1fe0ae6aa97083980b2422b056b0c5c047144
generated_at: 2026-11-10T06:22:53.124121+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-any-filter-choice.ts

## Purpose

Provides a single `WritableComputedRef` that bridges the `null` ↔ `undefined` mismatch between Vuetify `v-select` "any" items and the store's filter fields, eliminating the need to repeat this sentinel-mapping logic across every admin filter component.

## Key elements

- **`useAnyFilterChoice<T>(get, set): WritableComputedRef<T | null>`** — Accepts a getter and setter for a `T | undefined` filter field and returns a writable computed whose read side maps `undefined → null` (matching the `value: null` sentinel on "any" select items) and whose write side maps `null → undefined` (the shape the store's filters object expects). Designed to be bound directly via `v-model` on a `v-select`.

## Relationships

No graph neighbors recorded.

## Notes

- The `null` sentinel is deliberate: Vuetify's `getObjectValueByPath` returns `undefined`-valued fields as the item's *title* string, which would leak a translated label into the API request. `null` passes through unchanged, so "any" items must always use `value: null`.
- The composable is intentionally the **single** place that owns the `null` ⇄ `undefined` mapping; adding another inline conversion in a component is considered a regression (the docstring references "eleven hand-copies" as the anti-pattern this eliminates).
- Generic `<T>` means the composable is type-safe for any filter field shape (string, number, enum, etc.) without extra wrappers.
