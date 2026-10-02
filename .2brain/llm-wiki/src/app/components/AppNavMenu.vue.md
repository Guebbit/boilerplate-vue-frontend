---
source: src/app/components/AppNavMenu.vue
sha256: 548cf6b0cd48873b23df0d01b706a1593f7e66dcb03ed717f6994017c6861c1d
generated_at: 2026-10-02T11:44:24.170978+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavMenu.vue

## Purpose

A generic dropdown-menu shell that wraps `AppNavIconButton` as the activator and renders a list of `AppNavItem` entries as a WAI-ARIA `role="menu"`. It serves both the account menu and the admin menu, providing shared keyboard behavior (via Vuetify's `v-menu`) and an `#after` slot for non-navigation actions like logout.

## Key elements

- **Props** (`items`, `label`, `icon`, `description`, `badge`, `avatar`, `avatarUrl`, `avatarThumbnailUrl`, `dataTest`) — configure the activator button and the menu's visible content. `avatar`/`avatarUrl`/`avatarThumbnailUrl` are account-menu-specific; `badge` is used by e.g. the cart.
- **`menuOpen` (ref)** — two-way bound to `v-model` on `v-menu`; also read by `focusFirstItemOnOpen` to ignore stale `afterEnter` callbacks after a fast Escape-close.
- **`listElement` (ref)** — points at the rendered `v-list`; used to query the first `[role="menuitem"]` for the focus fallback.
- **`focusFirstItemOnOpen`** — fallback focus handler per the WAI-ARIA APG menu-button pattern. Fires on `after-enter`; if focus is not already inside the menu content, it calls `.focus()` on the first `menuitem`. Guards against both the menu being closed and focus already being inside the list (meaning Vuetify's built-in `focusChild()` already succeeded).
- **`#after` slot** — rendered inside the `v-list` after the item loop; used for actions like a logout button that are not navigation links.

## Relationships

- **`AppNavIconButton`** (imported) — rendered as the `v-menu` activator; receives all activator-facing props (`label`, `icon`, `description`, `badge`, `avatar*`, `data-test`) plus the Vuetify activator `props` binding.
- **`AppNavItem`** (type import from `app-nav-item.ts`) — shapes the `items` prop array; each item contributes `name` (key), `title`, `to`, optional `icon`, and optional `badge`.
- **`vue-i18n`** — `useI18n()` provides `t()` used to translate the badge label (`navigation.badge-items`) and item badges.

## Notes

- The `v-list-subheader` rendering `description` is marked `aria-hidden="true"` because a heading is not a valid child of `role="menu"`; the description is already part of the activator's accessible name.
- `focusFirstItemOnOpen` exists because Vuetify's internal `focusChild()` call can land while the opening transition still has `visibility: hidden`, causing `.focus()` to silently no-op under load. It is deliberately a fallback, not the primary mechanism.
- The component does not manage routing or state beyond open/closed; navigation is delegated to `v-list-item :to` and the `#after` slot's own elements.
