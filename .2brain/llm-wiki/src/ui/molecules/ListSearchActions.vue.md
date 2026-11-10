---
source: src/ui/molecules/ListSearchActions.vue
sha256: 0f6fa9f0c4bbd55faf2bcf2550ce34c2ad15581e37bae9c78db27a9f197e796d
signature: 02e21c9ec35282baf9b61eb249043bf5f49f332358aade31a77fbec1e108adbc
generated_at: 2026-11-10T06:28:21.263682+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/ListSearchActions.vue

## Purpose

A small button-row component that closes every admin list's filter form: a **Search** submit button, a **Reset** button, and a default slot for page-specific extras (e.g. a Create link or Export). It deliberately uses `type="submit"` on the Search button so the enclosing `<form>`'s own `@submit.prevent` remains the single place a search is triggered.

## Key elements

- **Props**
  - `loading?: boolean` — when true, Search shows its spinner and Reset is disabled.
  - `hookPrefix?: string` — namespaces the two `data-test` attributes so two rows on one page (tabbed lists) stay distinguishable. Defaults to bare `search-submit` / `search-reset`.
- **Emits**
  - `reset` — fired when the Reset button is clicked; the parent decides how to clear filters.
- **`hook(name)` helper** — builds the prefixed test-hook string (`${hookPrefix}-${name}` or just `name`).
- **Default `<slot />`** — rendered after the two buttons for any page-specific additions.
- **i18n** — button labels come from `generic.search` and `generic.reset` via `useI18n()`.
- **Icon** — `Search` from `lucide-vue-next`, 16 px, `aria-hidden`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The Search button does **not** emit its own event; it relies on the native form-submit. Do not add a `@click` handler expecting a separate `search` emit.
- `hookPrefix` only affects test-hook names, not any emitted event names or prop values.
- The `loading` prop is optional: lists that keep both buttons live during a request simply omit it.
