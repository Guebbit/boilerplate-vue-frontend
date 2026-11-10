---
source: src/ui/composables/use-deleted-filter-options.ts
sha256: 442be2152090e86a5eb0afdebecf24e1142e210decf5d3960b909ed2cb2102de
signature: b162b0919de55b9f1e087459e9a02b37977f5a2e8a1357bdb188a95c14364c69
generated_at: 2026-11-10T06:23:18.976448+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-deleted-filter-options.ts

## Purpose

Defines the three choices for an admin list's "Deleted" filter (any / live / soft-deleted) and exposes them as a locale-reactive composable. It exists so that every list whose records can be soft-deleted (products, users, orders) shares a single, consistent set of filter options rather than each hard-coding its own.

## Key elements

- **`DeletedFilterOption`** (interface) — Shape of one select option: `value` is `boolean | null` (`null` meaning "no filter") and `label` is the localized display string.
- **`useDeletedFilterOptions`** (composable, default export) — Returns a `ComputedRef<DeletedFilterOption[]>` containing the three options. Labels are pulled from `vue-i18n` via `t('generic.filter-deleted-*')`, so the array re-evaluates on locale change. Intended to be bound directly to a `v-select`'s `:items`.

## Relationships

No codebase graph neighbors are recorded for this file. It depends only on external packages (`vue`, `vue-i18n`).

## Notes

- The "any" option's value is **`null`**, not `undefined`. The JSDoc calls out pairing with `useAnyFilterChoice` at the call site, which maps `null` → `undefined` before the value reaches the store. Passing `null` straight to an API or store without that mapping will not clear the filter.
- The three `value`s (`null`, `false`, `true`) map directly to the API's `deleted` search parameter: absent = all, `false` = live only, `true` = soft-deleted only.
- Because the options live inside a `computed`, they are reactive to locale switches; caching the array outside the composable would break i18n.
