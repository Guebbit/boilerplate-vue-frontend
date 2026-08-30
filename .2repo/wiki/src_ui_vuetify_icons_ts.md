# src/ui/vuetify/icons.ts

## Purpose

Integrates **lucide-vue-next** as Vuetify's icon system, replacing the default `@mdi/font` icon-font payload. It provides the alias map Vuetify uses internally and the render function Vuetify calls to produce an icon vnode.

## Key elements

- **`lucideAliases: IconAliases`** — Maps every icon name Vuetify components reference (e.g. `collapse`, `checkboxOn`, `sortAsc`, `ratingHalf`, `backspace`) to a specific lucide-vue-next component. Includes a block of hotkey glyphs (`command`, `ctrl`, `space`, `shift`, `alt`, `enter`, arrow keys, `backspace`) used by `v-hotkey` and related components.
- **`lucideIconSet: IconSet`** — Supplies the single `component` render function Vuetify invokes. It calls `h(props.icon as Component, { size: '1.25em', strokeWidth: 2 })` to produce the vnode.
- **~45 lucide-vue-next icon imports** — Concrete components (Chevrons, Circles, Arrows, etc.) referenced by the alias map.

## Relationships

- **`src/ui/vuetify/index.ts`** — Imports `lucideAliases` and `lucideIconSet` from this file and registers them as the active icon system when creating/configuring the Vuetify app instance. This is the sole consumer in the dependency graph.

## Notes

- `ratingEmpty` and `ratingFull` both resolve to the same `Star` component; Vuetify differentiates them via CSS/props, not by swapping components.
- The render function hard-codes `size: '1.25em'` and `strokeWidth: 2`; there is no per-call override path visible here.
- Views can bypass the alias map entirely by passing any lucide component directly to a Vuetify `icon` prop — the render function just renders whatever `props.icon` holds.
- `ctrl` is mapped to `ChevronUp`, which is a stand-in glyph rather than a dedicated "control" symbol in the lucide set.
