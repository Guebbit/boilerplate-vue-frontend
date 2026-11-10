---
source: src/ui/composables/use-translation-tab-order.ts
sha256: c8cf1dd38e0bcf0ef8be87ce9ee2a186c8fb0403a702718a1c9e5c1ba3f5bf0e
signature: 29618f12d1872c574353245b817c23f3da066ff5b26ea80f7c792bc5c062a897
generated_at: 2026-11-10T06:25:58.504333+00:00
model: ollama:qwen3.8:27b
---

# src/ui/composables/use-translation-tab-order.ts

## Purpose

Derives the ordered list of "open" locale tabs for per-locale translation screens (ProductCreate, ProductEdit, EntityTranslations). It reads a locale→content record, drops `null` entries (tabs marked for removal), and moves the fallback tag to the front if it is already present. It exists so that the three screens sharing this ordering logic can read their *different* data sources (`form.translations`, `drafts`, etc.) through one small composable rather than duplicating the filter-and-reorder.

## Key elements

- **`useTranslationTabOrder(translations, fallbackTag)`** – The sole export. Accepts a `MaybeRefOrGetter` of a `Record<string, unknown>` and a `MaybeRefOrGetter<string | undefined>`, and returns a `ComputedRef<string[]>`. Internally it:
  1. Resolves both refs via `toValue`.
  2. Collects keys whose value is **not** `null`.
  3. If the resolved `fallbackTag` is among those keys, places it first and appends the rest in original order.
  4. Otherwise returns the filtered list unchanged.

## Relationships

No graph neighbors are registered for this file.

## Notes

- **It never manufactures a fallback entry.** If the fallback tag is absent from the record, it is simply not in the output. Screens that want an always-present fallback tab must seed the record themselves (e.g. `ProductCreate.vue`'s `watch(fallbackLocale, …)`), which also prevents an in-flight locale fetch from racing ahead of the entity's own data and producing an empty tab.
- Both parameters are `MaybeRefOrGetter`, so callers can pass a plain object, a `Ref`, or a getter function without any wrapper.
- The filter is `record[tag] !== null` (strict). `undefined`, empty strings, or other falsy-but-non-null values are treated as valid tab content.
- Ordering of non-fallback tags is preserved as `Object.keys` insertion order.
