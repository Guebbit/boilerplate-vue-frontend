# src/ui/molecules/DefinitionRow.vue

## Purpose

A single label/value row intended to sit inside a `<dl>` block. It provides the "dense, underlined" visual treatment for panels that list many facts at once (e.g. a dozen key–value pairs). It is the lightweight counterpart to `ItemDetailField`, which uses a bordered-tile-plus-icon layout for individual detail pages.

## Key elements

- **`label` prop (string, required)** – The human-readable term, rendered as `<dt>`. The caller is responsible for translation; the component performs no i18n itself.
- **Default slot** – Renders inside `<dd>` as the value. Callers can inject any markup (colored spans, links, etc.) without the component needing to know why.
- **Template** – A flex row (`justify-between`, `gap-4`) with a bottom border (`border-b border-on-surface/10`) and vertical padding (`py-1`). The `<dt>` gets `opacity-70`; the `<dd>` gets `font-medium`.

## Relationships

- **`src/ui/organisms/ItemDetailLayout.vue`** – Consumes `DefinitionRow` to render the list of attribute rows on a detail page.
- **`docs/reference/src-ui.md`** – Lists this component in the UI reference documentation.

## Notes

- The component renders `<dt>`/`dd>` inside a `<div>`, not as direct children of a `<dl>`. Ensure the parent provides the `<dl>` wrapper so the markup stays valid HTML.
- The JSDoc header explicitly contrasts this with `ItemDetailField`; if you're choosing between them, use `DefinitionRow` for dense multi-row lists and `ItemDetailField` for a single highlighted fact.
- No scoped styles or emitted events — styling is entirely via Tailwind utility classes in the template.
