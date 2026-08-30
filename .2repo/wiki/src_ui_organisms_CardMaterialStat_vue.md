# src/ui/organisms/CardMaterialStat.vue

## Purpose

A presentational stat tile (title, headline value, optional subtitle) rendered as a Vuetify `v-card` with a colored top border. It exists to give dashboards and panels a consistent, theme-aware "big number" card without duplicating layout markup.

## Key elements

- **Props** — `title` (label), `value` (already-formatted headline), `subtitle` (optional secondary line), `accent` (optional `ThemeAccent`, defaults to `'primary'`).
- **`accentBorderClass`** (computed) — Maps the `accent` prop to a Tailwind border utility (`border-t-primary` / `-secondary` / `-tertiary`), falling back to `'primary'` when the prop is omitted.
- **Template** — A single `<v-card>` with `min-w-44 border-t-4`, containing three `<p>` elements (title, value, conditional subtitle).

## Relationships

No graph neighbors are recorded. The component imports the `ThemeAccent` type from `@/ui/types.ts` and relies on Vuetify's `v-card` / `v-card-text` for rendering.

## Notes

- `value` is expected to arrive **pre-formatted** (the component performs no number/date formatting).
- The only runtime logic is the accent-to-class map; everything else is static markup and CSS classes.
- The top border is always present (`border-t-4`); only its **color** changes with `accent`.
