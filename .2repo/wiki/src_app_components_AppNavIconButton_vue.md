# src/app/components/AppNavIconButton.vue

## Purpose

Renders a single icon-only entry in the app's navigation bar as either a `<v-btn>` or a router link (`<v-btn :to>`), wrapped in a Vuetify tooltip and optional badge. Exists so every glyph in the bar carries a proper accessible name (tooltip text = `aria-label`) and so parents can attach menu-activator props without the component swallowing them.

## Key elements

- **Props** — `label`, `icon`, `to?`, `badge?`, `badgeLabel?`, `description?`, `avatar?`, `avatarUrl?`, `avatarThumbnailUrl?`. Control what renders (icon vs. avatar), navigation target, badge count/text, and the composed accessible name.
- **`buttonProps(tooltipProps)`** — merges the parent's fall-through attributes (`useAttrs()`) with the tooltip's activator props via `mergeProps`, so same-named event listeners from both sources are chained rather than overwritten.
- **`accessibleName()`** — returns `label` alone or `label: description` when a description (e.g. signed-in email) is supplied. Used for both `aria-label` on the button and the tooltip text.
- **`v-badge` with `:model-value`** — toggles the badge's visibility without unmounting/recreating the `<v-btn>`, preserving focus and tooltip state when the count changes.
- **`LazyImage` (avatar mode)** — renders the visitor's picture (or placeholder) in place of the icon; `alt=""` because the parent button already provides the full accessible name.
- **`<component :is="icon">` (icon mode)** — renders the passed Lucide component at 20 px with `aria-hidden="true"`.

## Relationships

No graph neighbors are recorded for this file. It is a leaf component: it imports from Vue, Vue Router (type-only), and `@/ui/molecules/LazyImage.vue`, but no other file in the graph is listed as dependent on it.

## Notes

- `inheritAttrs: false` is set; **all** non-prop attributes (e.g. a `v-menu` activator's `aria-expanded`, click handler, `data-test`) fall through to the inner `<v-btn>`. Do not add `v-bind="$attrs"` manually.
- The tooltip element itself gets `aria-label` because Vuetify mounts the `role="tooltip"` container before its text appears; an unnamed tooltip is an axe violation on every page.
- `model-value` (not `v-if`) on `v-badge` keeps the button element stable across badge show/hide, preventing focus loss and tooltip reset.
- `avatar` is intended **only** for the account button; every other nav entry represents a destination and should use `icon`.
- `avatarThumbnailUrl` is absent when the image is a remote/default URL or the digest job is still running — `LazyImage` handles the fallback.
