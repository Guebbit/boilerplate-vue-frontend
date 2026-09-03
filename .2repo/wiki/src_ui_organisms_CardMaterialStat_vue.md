# src/ui/organisms/CardMaterialStat.vue

## Purpose

A small presentational stat-tile component. It renders a Vuetify card containing a label, a large formatted value, and an optional subtitle, with a colored top border driven by a theme accent. It exists to give callers a consistent, theme-aware way to display a single metric without repeating layout markup.

## Key elements

- **Props** (`title`, `value`, `subtitle?`, `accent?`) — purely declarative inputs; no computed state or side-effects.
- **`accentBorderClass`** (computed) — the only piece of logic. Maps the `accent` prop (`ThemeAccent`) to one of three Tailwind `border-t-*` utility classes, defaulting to `primary` when the prop is omitted.
- **Template** — a single `<v-card>` (min-width 44, 4 px top border) wrapping a `<v-card-text>` with three `<p>` elements; the subtitle line is conditionally rendered via `v-if`.

## Relationships

- **`@/ui/types.ts`** — imports the `ThemeAccent` type used to constrain the `accent` prop.
- **Vuetify** (`v-card`, `v-card-text`) — provides the card shell and padding; the component adds no custom CSS beyond utility classes.

No other graph neighbors.

## Notes

- `value` is a `string | number` that the **caller** must already format (e.g., `"1,204"`); the component performs no number/decimal handling.
- The accent → class map is a plain object literal inside the computed; adding a new accent requires extending both the `ThemeAccent` type *and* this map.
- `min-w-44` (11 rem) is hard-coded; the tile does not flex to its parent width.
