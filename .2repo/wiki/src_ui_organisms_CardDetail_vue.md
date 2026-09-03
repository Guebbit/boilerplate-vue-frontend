# src/ui/organisms/CardDetail.vue

## Purpose

A thin presentational wrapper that renders a Vuetify `v-card` with a fixed set of visual defaults (flat variant, border, `p-6` padding) and a single default slot. Detail-page cards (`ItemDetailHero`, stat tiles, the main content card) all compose through this component so they share one card shell without duplicating the markup.

## Key elements

- **`as` prop** (optional, default `'article'`): controls the semantic tag rendered by the `v-card` root. Accepts `'article' | 'aside' | 'div' | 'section'`.
- **`defineOptions({ inheritAttrs: false })`**: prevents the caller's classes/attributes from landing on this component's own wrapper element.
- **`v-bind="$attrs"` on the `<v-card>`**: re-targets those passthrough attributes onto the inner `v-card` instead, so callers can set classes, `id`, data-attrs, etc. on the card itself.
- **Default slot**: the only content mechanism; the component adds no header, footer, or structural children of its own.

## Relationships

No graph neighbors. The file has no imports beyond the implicit Vuetify global (`v-card`) and exposes no named exports—consumers import it as a component and pass children via the default slot.

## Notes

- The `inheritAttrs: false` + `v-bind="$attrs"` split is intentional: without it, caller-supplied classes would hit *both* the wrapper and the `v-card`, making styling harder to target.
- The component is fully presentational; it applies no logic, emits no events, and exposes no ref. All behaviour lives in the composing detail-page organisms.
