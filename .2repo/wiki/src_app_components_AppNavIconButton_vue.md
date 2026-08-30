# src/app/components/AppNavIconButton.vue

## Purpose

Icon-only button/link for the desktop app bar. Because the bar shows glyphs without visible text, this component guarantees every entry carries an accessible name (the same string used for both `aria-label` and tooltip, per WCAG 2.5.3) and exposes attribute fall-through so a parent can wrap it in `v-menu` as an activator.

## Key elements

- **`props`** — `label` (tooltip + accessible name), `icon` (lucide component), `to` (optional route; makes it a link), `badge` / `badgeLabel` (count + its accessible name), `description` (appended to the accessible name, e.g. signed-in email), `avatar` / `avatarUrl` (renders a user picture instead of the icon; intended for the account entry only).
- **`buttonProps(tooltipProps)`** — merges `useAttrs()` (parent-passthrough like `aria-expanded`, click handlers) with the tooltip's activator props via `mergeProps`, chaining same-named listeners rather than overwriting.
- **`accessibleName()`** — returns `label` alone or `"label: description"` when `description` is set; used for both `aria-label` on `<v-btn>` and the tooltip text.
- **`defineOptions({ inheritAttrs: false })`** — suppresses Vue's default attr inheritance so attrs are routed manually to the inner `<v-btn>` instead of the root `<v-tooltip>`.

## Relationships

- **`tests/e2e/specs/keyboard.cy.ts`** — The e2e keyboard-navigation spec exercises this component in the live nav bar. The `data-test="nav-badge"` hook (present only while `badge` is truthy) and the fall-through `data-test` on `<v-btn>` are the selectors that spec relies on to assert focus order, activation, and badge visibility without hovering.

## Notes

- **`v-badge` uses `:model-value`, not `v-if`.** The `<v-btn>` stays the same DOM element whether or not a count is shown, so focus and the open tooltip survive a badge disappearing (e.g. cart empties).
- **`alt=""` on `LazyImage`.** The button already announces the full accessible name; a non-empty `alt` would cause a screen reader to say the account twice.
- **`aria-label` on `<v-tooltip>` itself.** Vuetify mounts the `role="tooltip"` container before its text is visible; without an explicit name the tooltip node is an axe violation on every page it appears on, even before hover.
- **`avatar` is account-specific by convention.** The doc-comment states it is set on the account button and nowhere else; every other nav entry represents a destination and uses `icon`.
- **Passing `avatar: true` with no `avatarUrl` is intentional** — it renders the shared missing-image placeholder rather than a generic person glyph.
