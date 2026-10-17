---
source: src/ui/composables/use-deleted-filter-options.ts
sha256: 442be2152090e86a5eb0afdebecf24e1142e210decf5d3960b909ed2cb2102de
generated_at: 2026-10-17T01:56:59.703568+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-deleted-filter-options.ts

## Purpose

Provides the three localized options for a "Deleted" status filter (any / live-only / deleted-only) used across all admin lists whose records can be soft-deleted (products, users, orders). The values map directly to the API's `deleted` search parameter.

## Key elements

- **`DeletedFilterOption`** (interface) — Shape of one select option: a `value` (`boolean | null`) and a `label` (string).
- **`useDeletedFilterOptions()`** (function) — Returns a `ComputedRef<DeletedFilterOption[]>` that re-resolves labels on locale change via `useI18n`. Bind the result to a `v-select`'s `:items`.
- **`null` as the "any" sentinel** — The first option's `value` is `null`, not `undefined`, so the "send no filter" case is distinguishable in the option list.

## Relationships

No graph neighbors recorded.

## Notes

- The `null` value for the "any" row is **not** sent to the API as-is. Call sites are expected to pair this composable with `useAnyFilterChoice`, which maps `null → undefined` before passing the value to the store. Forgetting that step will send a literal `null` to the API.
- The module exports only its two symbols (no default export); import them by name.
