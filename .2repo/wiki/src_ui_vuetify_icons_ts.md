# src/ui/vuetify/icons.ts

## Purpose

Wires **lucide-vue-next** into Vuetify as the application's icon system, replacing Vuetify's default `@mdi/font` icon font. It provides the alias table Vuetify internals look up by name and the render function that turns a resolved icon component into a vnode.

## Key elements

- **`lucideAliases`** (`IconAliases`) — Maps ~45 Vuetify-internal icon names (`collapse`, `checkboxOn`, `radioOff`, `sortAsc`, `loading`, hotkey glyphs, etc.) to specific lucide-vue-next components. Vuetify components reference icons through these keys; no alias entry is needed when a view passes a lucide component directly to an `icon` prop.
- **`lucideIconSet`** (`IconSet`) — Exposes a single `component` function. Vuetify calls it with resolved `IconProps`; it invokes `h(props.icon, { size: '1.25em', strokeWidth: 2 })` to produce the icon vnode.

## Relationships

- **`src/ui/vuetify/index.ts`** — Imports `lucideAliases` and `lucideIconSet` and registers them as the `icons` option in the Vuetify plugin configuration, making this module the sole icon source for every Vuetify component in the app.

## Notes

- `size: '1.25em'` and `strokeWidth: 2` are deliberately chosen to match Vuetify's default icon-font visual weight so lucide icons align with surrounding text and other UI elements.
- Several hotkey aliases are visual approximations rather than literal key glyphs (e.g. `ctrl` → `ChevronUp`, `space` → `RectangleHorizontal`, `alt` → `Option`).
- Both `ratingEmpty` and `ratingFull` map to the same `Star` component; visual differentiation is expected to come from Vuetify's `rating` component styling rather than a distinct icon.
