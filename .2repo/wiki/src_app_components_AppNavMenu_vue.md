# src/app/components/AppNavMenu.vue

## Purpose

Generic dropdown-menu shell that wraps an `AppNavIconButton` activator and renders a list of `AppNavItem` entries inside a Vuetify `v-menu` with proper ARIA menu semantics (`role="menu"` / `menuitem`). A single component powers both the account menu and the admin menu, giving them an identical keyboard contract and visual structure.

## Key elements

- **`AppNavItem` (exported interface)** — shape of one navigation entry: stable route `name`, translated `title`, locale-prefixed `to`, optional Lucide `icon`, `badge` count, `detail` text, and `pinned` flag.
- **Props** — `items`, `label`, `icon`, `description`, `badge`, `avatar` (+ `avatarUrl` / `avatarThumbnailUrl`), and `dataTest`. The avatar-related props are only meaningful for the account-menu use case.
- **`#after` slot** — renders inside the `v-list` after all items; intended for non-navigation actions (e.g. a "Sign out" button).
- **`t` from `useI18n`** — used to translate badge labels (`navigation.badge-items`) on both the activator and individual items.

## Relationships

- **`AppNavIconButton`** (imported) — rendered as the menu activator; receives the full set of display props (`label`, `icon`, `description`, `badge`, avatar fields, `dataTest`) plus Vuetify's activator bindings.
- No other graph neighbors are listed.

## Notes

- The description sub-header inside the menu is marked `aria-hidden="true"` because a `role="menu"` element does not permit a bare heading child; the same text is already part of the activator's accessible name.
- `item.name` (the route name) is used as the `v-for` key — it is stable across locales, unlike `title` or `to`.
- `badge` on the component level is the *activator* badge (visible when the menu is closed); `item.badge` is per-entry. They are independent.
- The `pinned` field on `AppNavItem` is declared but not consumed inside this component; the parent is expected to lift pinned entries out of the `items` array and render them on the nav bar beside this menu.
