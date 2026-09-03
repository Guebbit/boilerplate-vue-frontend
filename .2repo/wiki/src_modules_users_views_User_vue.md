# src/modules/users/views/User.vue

## Purpose

Read-only user detail page that loads a single user by route `id` and renders their profile fields (username, email, role, status, timestamps) in a structured layout with hero, stats, detail grid, aside, and navigation actions.

## Key elements

- **Component name** — `UserTargetPage` (set in the options block; distinct from the filename `User.vue`).
- **`id` prop** — optional route parameter used to identify which user to load.
- **`watchUser(() => id)`** — reactive watcher from `useUsersStore` that triggers a (re-)fetch whenever the route id changes.
- **`currentUser`** — Pinia state ref (via `storeToRefs`) holding the loaded user object; `null`/`undefined` while loading.
- **`heroTitle` / `heroDescription`** — computed fallbacks: username → route id → i18n title; email formatted via `formatText`.
- **`userRole` / `userStatus`** — computed labels derived from `formatFlag` (admin / active booleans) with localized strings.
- **Template slots** — `#hero`, `#stats`, `#aside`, `#actions` inside `ItemDetailLayout`; the main body is a `CardDetail` with a 2-column `ItemDetailField` grid.
- **Action buttons** — "Go to Edit" (shown only when `currentUser` exists) and "Go to List", both using `routerLinkI18n` for locale-aware route generation.

## Relationships

No graph neighbors are recorded for this file. It imports from `@/modules/users/store`, `@/infrastructure/i18n/router-link.ts`, `@/infrastructure/utils/formatters.ts`, and several `@/ui` components, but those files do not list this file as a neighbor in the provided graph.

## Notes

- The component name (`UserTargetPage`) differs from the filename (`User.vue`). Search by name, not filename.
- `watchUser` is a store-level watcher, not Vue's `watch`; it likely handles loading/error state internally. Calling it with `() => id` means the id is re-evaluated reactively.
- All user-readable strings go through `t(...)` with a `user-target-page.*` namespace; there are no hardcoded display strings.
- The "Edit" button is conditionally rendered (`v-if="currentUser"`) to avoid a broken link during the initial load.
- Icons in the detail grid are emoji/character glyphs (`#`, `🙂`, `✉`, `🛡`, `●`, `🕒`, `📅`, `🕘`) rather than icon-font classes.
