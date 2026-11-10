---
source: src/app/components/AppNavPinnedButton.vue
sha256: 235a72513d95ea45027b2a01eea82a52b294a2555e8dd68571bf82ed34d6e5a7
signature: 910a56f3becc46b30dbf8ffb0b3b12e5e9e71feb7c629e8d053d4880ecb1ab6d
generated_at: 2026-11-10T02:50:24.301604+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavPinnedButton.vue

## Purpose

Renders a single pinned item in the app navigation bar: an icon glyph with an optional count badge and an optional live detail string (e.g. a cart total) that collapses on narrow viewports. Composes a single `aria-label` so screen-reader output matches the visual layout at any width.

## Key elements

- **Props** – `label`, `icon` (lucide component), `to` (route), `badge?` (number), `badgeLabel?`, `detail?`. Zero or absent `badge` renders no badge; absent `detail` renders the glyph alone.
- **`buttonProps(tooltipProps)`** – Merges parent pass-through attrs, the `<v-tooltip>` activator props, and explicit `onFocus`/`onBlur` handlers via `mergeProps` (which chains same-named listeners rather than overwriting them).
- **`accessibleName()`** – Builds the `aria-label` string as `"Label: badgeLabel, detail"`, filtering out empty segments.
- **`useTouchTarget()`** – Supplies a 44 px min-height/width for touch devices; falls back to Vuetify defaults otherwise.
- **`useFocusTooltip()`** – Provides `tooltipOpen`, `canHover`, `openTooltipOnRealFocus`, `closeTooltip` so the tooltip opens on genuine focus (not hover) and closes on blur.
- **`defineOptions({ inheritAttrs: false })`** – Prevents Vue from auto-spreading parent attrs (e.g. `data-test`) onto the root `<v-tooltip>`; they are forwarded manually to the inner `<v-btn>` via `buttonProps`.

## Relationships

- **`src/app/components/use-focus-tooltip.ts`** – Consumed for all tooltip open/close state and the focus listeners that drive it. This component does not manage tooltip timing or hover logic itself; it only wires the returned handlers into the button's focus/blur events.

## Notes

- The `<v-badge>` **wraps** the `<v-btn>` rather than nesting inside it (same pattern as `AppNavIconButton`); placing the badge inside a `v-btn` causes the count to be invisible.
- `data-test="nav-badge"` is conditional (`badge ? 'nav-badge' : undefined`), so an absent badge is testable by the attribute's absence.
- Both the `<component :is="icon">` and the `<span>` for `detail` carry `aria-hidden="true"` because their content is already included in the computed `accessibleName()`; without this, a screen reader would announce them twice.
- The detail `<span>` uses `hidden sm:inline` — it is entirely absent from the DOM on narrow screens, so the accessible name still reads correctly (it filters on truthiness, not visibility).
- `mergeProps` is used (not object spread) specifically because it concatenates same-named event listeners instead of replacing them; switching to `{ ...a, ...b }` would silently drop the focus/blur handlers.
