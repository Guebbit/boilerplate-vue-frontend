---
source: src/app/components/AppNavBarLink.vue
sha256: 84b13d5f2af97f441c9a3b419c9969cb6e25038ee1da7a9fbed84a26fe4132bd
signature: 84b13d5f2af97f441c9a3b419c9969cb6e25038ee1da7a9fbed84a26fe4132bd
generated_at: 2026-11-10T02:49:41.398013+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavBarLink.vue

## Purpose

Renders a single desktop navigation-bar entry as a full-text link: a lucide icon glyph followed by a visible label, with an optional count badge on the glyph. It is the text-label counterpart to `AppNavIconButton`, used where the label has enough horizontal room to display.

## Key elements

- **Props** (defined via `defineProps`):
  - `label: string` — translated, visible text.
  - `icon: Component` — a lucide component rendered before the label.
  - `to: RouteLocationRaw` — locale-prefixed route destination (passed to `v-btn :to`).
  - `badge?: number` — count shown on the glyph; `0` or `undefined` hides the badge.
  - `badgeLabel?: string` — accessible name for the badge (e.g. `"3 items"`).
- **Template** — a single `v-badge` wrapping a `v-btn` (text variant, `px-3`). Inside the button: a dynamic `<component :is="icon">` (`size=18`, `aria-hidden`) and a `<span class="ml-2 capitalize">` holding the label.

## Relationships

- Conceptual sibling of **`AppNavIconButton`** (same badge-wraps-button pattern; this variant adds a visible label).
- Depends on **Vuetify** (`v-badge`, `v-btn`) and **vue-router** (`RouteLocationRaw` type).
- Receives its icon as a prop from the caller (typically a lucide icon component); no import of a specific icon is made here.

## Notes

- The badge is controlled via `v-badge :model-value="Boolean(badge)"`, **not** `v-if`. This keeps the same DOM element mounted when the count changes, so focus is not reset.
- `data-test="nav-badge"` is set only when `badge` is truthy, making the absence of a badge assertable in tests.
- Badge is anchored `top start` with `offset-x: 16` so it overlaps the glyph, not the label text.
- The label span carries its own `capitalize` class; the dictionary may store labels in lowercase and this normalises the display.
- Because the visible text is the accessible name, the component needs no `aria-label` or tooltip (unlike `AppNavIconButton`). The icon is `aria-hidden="true"`.
- No `<style>` block; all styling is via utility classes and Vuetify props.
