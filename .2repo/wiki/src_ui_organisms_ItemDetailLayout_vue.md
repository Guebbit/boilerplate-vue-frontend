# src/ui/organisms/ItemDetailLayout.vue

## Purpose

Shared layout skeleton for entity detail/edit pages (product, order, user, etc.). It provides a consistent max-width container with a hero+stats row, a main+aside content grid, and an optional actions bar, while exposing a `--detail-accent` CSS custom property so child components can inherit a per-entity accent color without explicit prop drilling.

## Key elements

- **`accent` prop** (`ThemeAccent`, default `'primary'`) — mapped to the `--detail-accent` CSS variable on the root `<section>`.
- **Named slots** — `hero`, `stats`, default (main card), `aside`, `actions`. All are optional; `stats`, `aside`, and `actions` are conditionally rendered via `useSlots()` checks so unused sections collapse out of the DOM.
- **Layout grid** — two responsive `lg:` breakpoints switch between stacked (mobile) and a `2fr / 1fr` two-column arrangement for hero+stats and main+aside rows.

## Relationships

- **`src/ui/molecules/DefinitionRow.vue`** — Typical consumer placed inside the default or `aside` slot; reads the `--detail-accent` variable set by this component to color its definition chips/rows.
- **`docs/reference/src-ui.md`** — Documents this organism's slot contract and the `--detail-accent` convention for other UI components.

## Notes

- The `--detail-accent` value is resolved at render time via `var(--v-theme-${accent})`, so the accent must already be registered as a Tailwind/theme CSS variable (e.g. `--v-theme-success`). Passing an unregistered name silently falls back to no color.
- The `aside` column only appears when a component is slotted into it; the grid class is toggled conditionally to avoid an empty column on desktop.
- No script-side state or events are exposed — the component is purely presentational layout.
