---
source: src/ui/vuetify/icons.ts
sha256: d3bf5be3738d32b7962a9c9c99f90bd0744c2f645b79cac6f28f103196804864
signature: 403e83c0f2ae7c1c90a72c633346f5e4ae2d9c9e56eb3b182538c417abf1ad44
generated_at: 2026-11-10T06:33:52.211920+00:00
model: ollama:qwen3.8:27b
---

# src/ui/vuetify/icons.ts

## Purpose

Wires **lucide-vue-next** into Vuetify as its icon system, providing the alias map Vuetify internals look up and the render function Vuetify calls to produce icon vnodes. This keeps the app on a single icon library (already used in views) and avoids adding the `@mdi/font` icon-font payload.

## Key elements

- **`lucideAliases: IconAliases`** — Maps every internal icon name Vuetify components reference (e.g. `collapse`, `checkboxOn`, `sortAsc`, hotkey glyphs like `ctrl`/`alt`) to a specific `lucide-vue-next` component.
- **`lucideIconSet: IconSet`** — The object Vuetify consumes as its icon set. Its single `component` function receives `IconProps`, reads `props.icon` (the resolved lucide component), and returns `h(component, { size: '1.25em', strokeWidth: 2 })`.

## Relationships

- **`src/ui/vuetify/index.ts`** — Imports `lucideAliases` and `lucideIconSet` and registers them in Vuetify's configuration (`icons: { aliases, set }`), making them available to every Vuetify component in the app.

## Notes

- `size: '1.25em'` and `strokeWidth: 2` are deliberate: they match Vuetify's default icon-font metrics so lucide icons sit at the same visual weight as the rest of the UI.
- Both `success` and `error` map to `CircleAlert`; there is no distinct "error" glyph in this set.
- `ratingEmpty` and `ratingFull` both map to `Star` (full vs. empty is presumably handled by Vuetify's opacity/color, not by a different component).
- Hotkey aliases (`ctrl`, `alt`, `space`, `enter`, etc.) exist solely for `v-hotkey`-style components; they are not used by standard Vuetify widgets.
