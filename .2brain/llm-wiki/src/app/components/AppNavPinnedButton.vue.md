---
source: src/app/components/AppNavPinnedButton.vue
sha256: dc9e7b70e0d40c8378f64d3a8339ea869c27589c3d9afe8f08e19989acb1f12d
generated_at: 2026-10-02T14:36:27.586231+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavPinnedButton.vue

## Purpose

Renders a single "pinned" entry in the app navigation bar: an icon glyph with an optional count badge and an optional live detail string (e.g. a cart total). It exists so that a pinned nav item can show richer information than a plain icon button while keeping one cohesive `aria-label` that reads the same at every viewport width.

## Key elements

- **`props`** — `label`, `icon` (lucide component), `to` (route), `badge?` (count), `badgeLabel?` (accessible badge text), `detail?` (formatted total shown beside the glyph, hidden below `sm`).
- **`buttonProps(tooltipProps)`** — Merges parent-passed attributes (e.g. `data-test`), the `<v-tooltip>` activator props, and explicit `onFocus`/`onBlur` handlers using `mergeProps` so same-named listeners chain rather than overwrite.
- **`accessibleName()`** — Builds the composite `aria-label` string from `label`, `badgeLabel`, and `detail` (e.g. `"Cart: 3 items, €59.97"`), filtering out absent parts.
- **`useFocusTooltip()`** — Provides `tooltipOpen`, `openTooltipOnRealFocus`, and `closeTooltip`; drives tooltip visibility on keyboard focus and closes it on blur.
- **Template** — `<v-tooltip>` wraps a `#activator` slot containing `<v-badge>` → `<v-btn>`. The badge *wraps* the button (not nested inside it) and is anchored `top start`. The detail `<span>` is `aria-hidden` and `hidden sm:inline`.

## Relationships

- **`src/app/components/use-focus-tooltip.ts`** — Imported as `useFocusTooltip`; supplies the tooltip open/close state and the real-focus/blur handlers that `buttonProps` attaches to the `<v-btn>`.

## Notes

- `defineOptions({ inheritAttrs: false })` is set so that non-prop attributes (like `data-test`) land on the `<v-btn>` via `useAttrs()` + `mergeProps`, not on the tooltip wrapper.
- The badge intentionally **wraps** the button rather than sitting inside it; nesting a `<v-badge>` inside a `<v-btn>` causes the count to render invisibly (same convention as `AppNavIconButton`).
- Both the icon and the detail `<span>` carry `aria-hidden="true"` because their content is already spoken via the composite `aria-label`; without this a screen reader would announce them twice.
- `data-test="nav-badge"` is only present when `badge` is truthy, making "no badge" a testable state.
- The `sm:` breakpoint (`hidden … sm:inline`) is the sole responsive rule; below it the detail text disappears visually but remains in the `aria-label`.
