---
source: src/ui/molecules/DefinitionRow.vue
sha256: b816f95b517227fb494aeb4fb2d3b0ee1f6daf9e8ecfb408e65d1a8971a916d0
signature: b816f95b517227fb494aeb4fb2d3b0ee1f6daf9e8ecfb408e65d1a8971a916d0
generated_at: 2026-11-10T06:26:50.885105+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/DefinitionRow.vue

## Purpose

A single label/value row intended for use inside a `<dl>`, providing a dense, underlined presentation for panels that list many facts at once. It is the lightweight counterpart to `ItemDetailField` (a bordered, icon-bearing tile for detail pages).

## Key elements

- **`label: string` prop** — the row's left-hand text. Must already be translated; the component performs no i18n.
- **Default slot** — renders the value (right-hand side). Delegating the value to a slot lets callers apply custom styling, wrapping, or colouring without this component needing to know the reason.
- **Template markup** — a flex row (`justify-between`) containing a `<dt>` (label, muted opacity) and a `<dd>` (slot, right-aligned, `font-medium`, `wrap-anywhere`). A `border-b` at 10 % surface opacity separates rows.

## Relationships

No dependency-graph neighbors are recorded. The component is fully self-contained: it imports nothing and exports nothing beyond the implicit component itself.

## Notes

- **No i18n.** The `label` prop contract is "already translated." Passing a raw key will render verbatim.
- **Semantic `<dl>` row.** The root is a `<div>`, but it contains `<dt>`/`dd>` elements. Callers are expected to wrap multiple rows inside a `<dl>` for correct document semantics.
- **`wrap-anywhere`** on the `<dd>` handles long unbreakable strings (tokens, hashes) that would otherwise overflow the flex row.
- **Sibling component.** `ItemDetailField` is the "other shape" for the same label/value concept; use this one for compact lists, that one for single-field detail views.
