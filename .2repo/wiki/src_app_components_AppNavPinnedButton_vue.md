# src/app/components/AppNavPinnedButton.vue

## Purpose

Renders a single pinned entry in the app navigation bar: a glyph with an optional count badge and an optional live detail string (e.g. a cart total). It exists to give the nav bar a richer, information-dense button variant beyond the plain icon button, while keeping a single, width-independent accessible name.

## Key elements

- **Props** — `label`, `icon` (lucide component), `to` (route), optional `badge` (number), `badgeLabel` (string), `detail` (string). Zero/absent badge or detail renders the glyph alone.
- **`buttonProps(tooltipProps)`** — merges parent-passed non-prop attributes (`useAttrs`) with the `<v-tooltip>` activator props via `mergeProps`, so same-named listeners chain rather than shadow.
- **`accessibleName()`** — builds the single `aria-label` string (e.g. `"Cart: 3 items, €59.97"`) from `label`, `badgeLabel`, and `detail`, filtering out absent parts.
- **`inheritAttrs: false`** — ensures non-prop attributes land on the `<v-btn>`, not the `<v-tooltip>` wrapper.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- The badge **wraps** the button rather than nesting inside `<v-btn>`; nesting inside a `v-btn` causes the count to not render (same pattern as `AppNavIconButton`).
- `data-test="nav-badge"` is applied conditionally (`badge ? 'nav-badge' : undefined`), making the absence of a badge testable.
- The detail `<span>` carries `aria-hidden="true"` because its text is already part of `accessibleName()`; omitting the attribute would cause screen readers to announce the value twice.
- Detail text uses `hidden sm:inline` — invisible below the `sm` breakpoint, but still included in the accessible name at all widths.
- The icon `<component :is="icon">` is also `aria-hidden` for the same reason.
- Badge is anchored `location="top start"` with `:offset-x="16"` so it overlaps the glyph, not the detail text.
