# src/ui/molecules/DefinitionRow.vue

## Purpose

A single label/value row (`<dt>`/`<dd>`) for dense `<dl>`-style panels that list many facts at a glance. It exists as the compact counterpart to `ItemDetailField` (a bordered, icon-bearing tile for detail pages). The component is purely presentational: it applies layout and typography but leaves all value rendering and i18n to the caller.

## Key elements

- **`label` prop (string)** — The already-translated field name displayed in the `<dt>`. The component performs no i18n itself.
- **Default slot** — Renders the value inside the `<dd>`. Callers can inject any content (colored text, links, components) without this component needing to know why.
- **Template structure** — A flex row (`justify-between`, `gap-4`) with a bottom border (`border-b border-on-surface/10`). The `<dt>` is dimmed via `opacity-70`; the `<dd>` is `font-medium`.

## Relationships

Leaf component with no imports, no composables, and no child components. It depends only on global Tailwind utility classes.

## Notes

- Despite the `<dt>`/`<dd>` semantics, the wrapper is a `<div>`, not a `<dl>`. The parent is responsible for providing a real `<dl>` ancestor if HTML semantics matter (e.g. for accessibility or styling).
- The component deliberately accepts a pre-translated `label`. Passing a raw i18n key will render that key verbatim.
- The border-bottom (`border-b`) means the last row in a list will show a trailing divider; callers may need to suppress it (e.g. `last:border-0`) if undesired.
