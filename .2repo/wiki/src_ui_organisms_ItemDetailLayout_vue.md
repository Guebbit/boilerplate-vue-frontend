# src/ui/organisms/ItemDetailLayout.vue

## Purpose

Shared layout skeleton for entity detail/edit pages (product, order, user, etc.). Provides a consistent two-column grid structure (hero/stats, main card/aside, actions) and sets a `--detail-accent` CSS custom property so that inner components (ItemDetailField, ItemDetailHero, chips) inherit the per-entity accent color without needing individual prop drilling.

## Key elements

- **`accent` prop** (`ThemeAccent`, optional) — mapped to `var(--v-theme-{accent})` and written as `--detail-accent` on the root `<section>`. Defaults to `primary`.
- **Named slots** — `hero`, `stats`, default (main card), `aside`, `actions`. All are optional; the template conditionally renders their wrapping `<div>` only when the slot is populated (checked via `useSlots()`).
- **Grid layout logic** — hero and stats sit in a `2fr / 1fr` row; the main card and aside share a similar split that collapses to a single column on small screens; actions is a simple flex-wrap row.

## Relationships

- **`@/ui/types.ts`** — imports the `ThemeAccent` type used to type the `accent` prop.
- Consumed by entity-specific detail pages (e.g., product, order, user) which fill the named slots.
- The `--detail-accent` variable is read by child components such as ItemDetailField and ItemDetailHero to resolve their accent styling.

## Notes

- Optional sections (`stats`, `aside`, `actions`) are gated with `v-if="slots.{name}"` so the layout renders no empty grid tracks when a caller doesn't use them.
- The `minmax(0, 2fr)` grid track (rather than plain `2fr`) is intentional — it prevents long content (URLs, unbreakable strings) from forcing the column wider than the viewport.
- The accent resolution assumes a CSS custom-property naming convention of `--v-theme-{name}` exists globally (likely defined in the theme system); there is no fallback if an unknown accent is passed.
