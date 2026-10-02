---
source: src/app/components/AppNavIconButton.vue
sha256: d90fa1a7b0c3caebcf9affd68871ebc3c0df7770951ff4f9926910703d13c599
generated_at: 2026-10-02T14:36:09.813270+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavIconButton.vue

## Purpose

Icon-only navigation button (or router-link) for the desktop nav bar. Because the bar shows glyphs alone, this component guarantees every entry carries a proper accessible name in two places—`aria-label` for screen readers and a visible tooltip for sighted users—using the *same* string so a voice-control user can read the tooltip and speak it (WCAG 2.5.3). All non-prop attributes fall through to the inner `<v-btn>` so a parent can wrap the component as a `v-menu` activator.

## Key elements

- **`props`** — `label` (tooltip + accessible name), `icon` (lucide component), `to` (makes it a link), `badge` / `badgeLabel` (count badge), `description` (appended to accessible name, e.g. signed-in email), `avatar` / `avatarUrl` / `avatarThumbnailUrl` (render the user's picture instead of a generic icon).
- **`buttonProps(tooltipProps)`** — merges three attribute sources with `mergeProps`: parent fall-through attrs, the `<v-tooltip>` activator props, and the explicit `onFocus`/`onBlur` pair. `mergeProps` chains same-named listeners rather than replacing them.
- **`accessibleName()`** — returns `label` or `"label: description"` depending on whether `description` is set. Used for both `aria-label` and the tooltip text.
- **`useFocusTooltip()`** (imported) — supplies `tooltipOpen`, `openTooltipOnRealFocus`, `closeTooltip`; drives the tooltip on real keyboard focus rather than `:open-on-focus`.
- **`LazyImage`** (imported) — renders the avatar when `avatar` is true; falls back to the shared missing-image placeholder if no URL is supplied.
- **`inheritAttrs: false`** — prevents Vue from auto-applying fall-through attrs to the root `<v-tooltip>`; they are forwarded manually to `<v-btn>`.

## Relationships

- **`src/app/components/use-focus-tooltip.ts`** — provides the tooltip open/close state and the focus/blur listeners that replace Vuetify's default `open-on-focus` behavior, ensuring the tooltip only appears on real keyboard focus.
- **`@/ui/molecules/LazyImage.vue`** — sole image component inside the button; receives `avatarUrl`, `avatarThumbnailUrl`, and a hardcoded 28×28 rounded shape.

## Notes

- The `<v-tooltip>` carries an explicit `:aria-label="label"` in addition to `:text`. Without it, Vuetify mounts the `role="tooltip"` container before text is painted, producing an axe "tooltip has no accessible name" violation on every page that renders one.
- The badge uses `:model-value` (not `v-if`) so the underlying `<v-btn>` element is stable across badge show/hide—focus and tooltip state are not lost when a cart count drops to zero.
- `alt=""` on the `<LazyImage>`: the `<v-btn>` already announces the full name; an additional image alt would cause a double-read for the account avatar.
- The `data-test="nav-badge"` attribute is applied to the badge only while `badge` is truthy, making "no badge" a testable state.
