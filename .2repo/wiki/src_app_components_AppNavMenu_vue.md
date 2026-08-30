# src/app/components/AppNavMenu.vue

## Purpose

A generic dropdown-menu shell that wraps `AppNavIconButton` as the activator and renders an array of `AppNavItem` entries inside a `role="menu"` list. It is the shared component behind both the account menu and the admin menu, giving them an identical keyboard-navigation contract (Vuetify `v-menu` defaults) plus correct ARIA menu semantics and a `#after` slot for non-navigation actions such as logout.

## Key elements

- **`AppNavItem` (exported interface)** — Shape of one menu entry: `name` (stable route name, used as the `:key`), `title` (translated label), `to` (route target), optional `icon` component, and optional `badge` count.
- **Props** — `items`, `label`, `icon`, `description?`, `badge?`, `avatar?`, `avatarUrl?`, `dataTest?`. The `avatar`/`avatarUrl` pair is account-menu–only; it replaces the icon on the activator with the visitor's picture.
- **`#after` slot** — Rendered as the last child inside the `v-list` / `role="menu"` container; intended for actions that are not page navigations (e.g., a logout button).
- **`useI18n`** — Provides `t()` for badge-label strings (`navigation.badge-items`) on both the activator and individual items.

## Relationships

- **`tests/e2e/specs/keyboard.cy.ts`** — E2E spec that exercises the keyboard contract this component relies on: ArrowDown to open the menu, arrow keys to walk `menuitem` entries, and Escape to close and return focus to the `AppNavIconButton` activator. The component itself does not implement this behavior; it inherits it from Vuetify's `v-menu`.

## Notes

- The `description` subheader rendered inside the menu is marked `aria-hidden="true"` because a heading is **not** a permitted child of `role="menu"`. Its accessible-name contribution comes from being folded into the activator's label instead.
- `AppNavItem.name` (the route name) is the render `:key`, not `title` or `to`. This keeps re-renders stable across locales.
- `avatarUrl` is only meaningful when `avatar` is `true`; it is left unresolved (no URL building happens here).
- The component is intentionally locale-agnostic: all display strings arrive pre-translated via `items` and `label`; the only i18n call is for the "N items" badge label.
