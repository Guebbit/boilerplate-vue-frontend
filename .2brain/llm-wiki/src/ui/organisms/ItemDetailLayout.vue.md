---
source: src/ui/organisms/ItemDetailLayout.vue
sha256: 2daf4fb40f69740e061dcf54eac76af42649c6871c54b0751d8d57a97a10b60a
signature: a8adf98ac015f397c34977cae33dcfb73ca262a7620fb414d18a1679a41eba33
generated_at: 2026-11-10T06:32:22.169006+00:00
model: ollama:qwen3.8:27b
---

# src/ui/organisms/ItemDetailLayout.vue

## Purpose

Shared layout skeleton for entity detail/edit pages (product, order, user, etc.). It establishes a responsive grid structure via named slots and sets a `--detail-accent` CSS custom property so that descendant components (e.g. `ItemDetailField`, `ItemDetailHero`, chips) can pick up a per-entity accent color without each one receiving it as a prop.

## Key elements

- **`accent` prop** (`ThemeAccent`, optional, defaults to `'primary'`) — mapped to `var(--v-theme-{accent})` on the root `<section>` as `--detail-accent`.
- **`useSlots()`** — read at render time to conditionally skip the `stats`, `aside`, and `actions` regions when the caller provides no content for them.
- **Slots** — `hero` (always rendered), `stats` (optional, tile grid), default (main card), `aside` (optional, flex column), `actions` (optional, action button row).
- **Root `<section>`** — constrained to `max-w-6xl`, centered, vertical flex with `gap-6`.

## Relationships

No graph neighbors are recorded for this file. The doc comment references `ItemDetailField`, `ItemDetailHero`, and chip components as downstream consumers of the `--detail-accent` variable, but none of them appear as direct graph neighbors.

## Notes

- Purely structural: no data fetching, no business logic, no computed state beyond slot presence checks.
- The two-column grids (`lg:grid-cols-detail`, `lg:grid-cols-tiles`) rely on Tailwind config entries defined elsewhere; they are not inlined in this file.
- Conditional rendering is driven by `slots.xxx` (the `useSlots()` return), not by a separate prop, so callers simply omit a slot to collapse its region.
