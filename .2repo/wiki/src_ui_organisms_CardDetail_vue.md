# src/ui/organisms/CardDetail.vue

## Purpose

A minimal presentational card shell that provides a consistent flat, bordered, padded surface (`v-card`) for detail-page content. It exists so that higher-level organisms (`ItemDetailHero`, stat tiles, the main content card) share identical card styling without duplicating the `v-card` configuration.

## Key elements

- **`as` prop** (optional, default `'article'`) — controls the semantic HTML tag rendered by the `v-card` (`article | aside | div | section`).
- **`defineOptions({ inheritAttrs: false })`** — suppresses automatic attribute fall-through on the root `<script setup>` wrapper.
- **`v-bind="$attrs"` on `<v-card>`** — manually forwards any passed classes/attributes so they land on the `v-card` element rather than a wrapper, keeping the DOM flat.
- **Single default slot** — all rendered content is supplied by the caller; the component itself adds no markup beyond the card chrome.

## Relationships

No dependency-graph neighbors are recorded for this file.

## Notes

- The component is purely presentational: no data fetching, no events emitted, no computed state.
- Because `inheritAttrs` is disabled, callers **must** rely on `$attrs` pass-through for styling/behavioral attributes (e.g., `class`, `data-*`, `v-*` bindings). Attributes passed to the component will *not* appear on a wrapper element—they go straight onto the `v-card`.
- The `p-6` padding and `variant="flat"` + `border` combo are hard-coded; override them via passed attributes (e.g., a conflicting `class` will merge with `p-6`).
