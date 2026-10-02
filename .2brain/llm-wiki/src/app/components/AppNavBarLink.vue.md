---
source: src/app/components/AppNavBarLink.vue
sha256: 84b13d5f2af97f441c9a3b419c9969cb6e25038ee1da7a9fbed84a26fe4132bd
generated_at: 2026-10-02T11:43:44.059604+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavBarLink.vue

## Purpose

Desktop navigation-bar entry that renders a text link with a leading Lucide icon and an optional count badge on the glyph. Unlike its icon-only sibling `AppNavIconButton`, the visible label doubles as the accessible name, so no `aria-label` or tooltip is required.

## Key elements

- **Props** — `label` (translated string), `icon` (Lucide `Component`), `to` (`RouteLocationRaw`), `badge?` (count; `0` or absent = no badge), `badgeLabel?` (accessible name for the badge, e.g. "3 items").
- **`v-badge` (wrapper)** — Wraps the `v-btn` rather than nesting inside it (nested inside a `v-btn` the count does not render). Uses `model-value="Boolean(badge)"` instead of `v-if` so the button element identity is preserved and focus is not reset when the count changes. Anchored `top start` with `:offset-x="16"` to sit over the glyph.
- **`v-btn` (text variant)** — Navigates to `to`; contains the icon and label span.
- **Dynamic icon** — `<component :is="icon" :size="18" aria-hidden="true" />` renders the Lucide glyph.
- **Label span** — `<span class="ml-2 capitalize">` applies its own `text-transform` so the dictionary's lowercase labels render with a leading capital, matching the drawer.
- **`data-test`** — Applied to the badge element only while a badge is showing (`badge ? 'nav-badge' : undefined`), making the "no badge" state directly assertable.

## Relationships

- Sibling to `AppNavIconButton` (referenced in module doc comment); the two components share the same badge-wraps-button pattern and badge semantics.

## Notes

- The badge **wraps** the button. Placing `v-badge` *inside* the `v-btn` suppresses the count entirely.
- Use `model-value` (not `v-if`) on `v-badge` to keep the button as a stable DOM element; this prevents focus loss when a count toggles.
- The icon is always `aria-hidden`; accessibility of the link relies solely on the visible `label` text.
- `badgeLabel` is important for screen readers—without it Vuetify announces the generic string "Badge" instead of a meaningful name.
