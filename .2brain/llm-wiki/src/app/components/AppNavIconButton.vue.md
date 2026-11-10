---
source: src/app/components/AppNavIconButton.vue
sha256: a6b8b41e18323813edb626f74358ccccbc15a203e2126b72de31632ac6a11563
signature: 9a3152f7e82cd392950a37b88b7267ad98de29cc2bcb973fc126b85af19c325f
generated_at: 2026-11-10T02:49:51.337634+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavIconButton.vue

## Purpose
Renders a single icon-only button (or router link) in the desktop navigation bar. It ensures every glyph carries a proper accessible name (`aria-label`) and a visible tooltip from the **same** string, satisfying WCAG 2.5.3 for voice-control users. It also serves as a drop-in activator for parent `v-menu` wrappers by forwarding all non-prop attributes to the inner `<v-btn>`.

## Key elements
- **Props** — `label`, `icon`, `to`, `badge`, `badgeLabel`, `description`, `avatar`, `avatarUrl`, `avatarThumbnailUrl`. `to` switches the element between `<v-btn>` (button) and `<v-btn :to>` (link). `avatar` replaces the icon with a `LazyImage` portrait.
- **`buttonProps(tooltipProps)`** — merges three sources of listeners/attributes via Vue's `mergeProps`: parent fall-through attrs, the tooltip's activator props, and the focus/blur pair from `useFocusTooltip`. Same-named listeners are chained, not replaced.
- **`accessibleName()`** — returns `label` or `"label: description"` for the `aria-label`, keeping the tooltip short while the screen reader hears extra context (e.g. the signed-in email).
- **`inheritAttrs: false` + `useAttrs`** — disables default attribute inheritance so all extra attrs (menu `aria-expanded`, click handlers, `data-test`) are explicitly merged onto the `<v-btn>`.

## Relationships
- **`use-focus-tooltip.ts`** — provides `tooltipOpen`, `canHover`, `openTooltipOnRealFocus`, and `closeTooltip`. The component calls `openTooltipOnRealFocus` on real (non-mouse) focus and `closeTooltip` on blur; `canHover` gates whether hover actually opens the tooltip.

## Notes
- Badge visibility uses `v-badge :model-value` (not `v-if`) so the underlying button element is never destroyed/recreated when the count hits zero — focus and tooltip state survive.
- `data-test="nav-badge"` is present only while `badge` is truthy, making "no badge" a testable assertion.
- The avatar `LazyImage` uses `alt=""` (empty) because the parent `<v-btn>` already carries the full accessible name; a non-empty alt would cause a double announcement.
- The static icon uses `aria-hidden="true"` for the same reason.
- `aria-label` is set on the `<v-tooltip>` container **and** the `<v-btn>`; the former is required because Vuetify mounts the `role="tooltip"` node before its text is visible, and an unnamed tooltip node is an axe violation.
- `avatarThumbnailUrl` may be `null` when the image is a remote/default URL or its digest job hasn't completed — `LazyImage` handles the missing-thumbnail case.
