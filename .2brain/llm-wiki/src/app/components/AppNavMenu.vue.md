---
source: src/app/components/AppNavMenu.vue
sha256: 716889ee2ccc45fa1ca080f8c2834b5f542aab3f0154c8ff43dc0dfd86c66d11
generated_at: 2026-10-17T00:04:48.631384+00:00
model: ollama:qwen3.8:27b
---

# src/app/components/AppNavMenu.vue

## Purpose

A generic dropdown-menu shell that wraps an `AppNavIconButton` activator and renders an array of `AppNavItem`s as a WAI-ARIA `role="menu"` list. It exists so the account menu and the admin menu share one keyboard/interaction contract (Vuetify `v-menu` arrow-key navigation, Escape-to-close, focus management) without duplicating that logic in two places.

## Key elements

- **Props** — `items`, `label`, `icon`, `description?`, `badge?`, `avatar?`, `avatarUrl?`, `avatarThumbnailUrl?`, `dataTest?`. The `avatar*` props are only meaningful for the account-menu variant; `dataTest` is forwarded to the activator for e2e selectors.
- **`menuOpen` (ref)** — bound to `v-model` on `v-menu`; also read by the focus-fallback to ignore a late `afterEnter` that fires after a fast Escape close.
- **`listElement` (ref)** — template ref on the inner `v-list`, used to query the first `menuitem` for focus.
- **`focusFirstItemOnOpen()`** — WAI-ARIA APG menu-button fallback: if the menu is open but focus is not yet inside it (because Vuetify's own `focusChild()` landed while content was still `visibility: hidden`), it programmatically focuses the first `[role="menuitem"]`.
- **`#after` slot** — renders arbitrary content at the bottom of the menu (e.g. a logout button) that is not a navigation entry.
- **Group subheaders** — rendered via `v-list-subheader` with `aria-hidden="true"` when consecutive items share a `group` value; only the first item of a run gets a heading.

## Relationships

- **`AppNavIconButton.vue`** (imported) — rendered inside the `v-menu` activator slot; receives all presentation props (icon, label, badge, avatar, `dataTest`) and the `menuProps` spread from Vuetify.
- **`app-nav-item.ts`** (imported) — provides the `AppNavItem` type consumed by the `items` prop and the template loop.
- **`vue-i18n`** (imported) — `useI18n()` supplies the `t` function used for badge label translations (`navigation.badge-items`).

## Notes

- The description heading and group subheaders inside the menu are `aria-hidden="true"` because a heading is not a permitted child of a `role="menu"` element per the ARIA spec; the information is already conveyed by the activator's accessible name and each item's own title.
- `focusFirstItemOnOpen` guards on `content.contains(document.activeElement)` rather than checking the activator specifically, because by the time `afterEnter` fires, Vuetify's own `focusChild()` has usually already succeeded and the guard is a no-op.
- The component is intentionally generic: it does not import or reference the account or admin menus directly. Callers pass their own `items` array and decide whether to set `avatar: true`.
