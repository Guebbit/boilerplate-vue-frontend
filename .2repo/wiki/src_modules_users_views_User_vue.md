# src/modules/users/views/User.vue

## Purpose

Read-only user detail page (registered as `UserTargetPage`). Receives a user `id` via props, triggers a fetch through the users store, and renders the user's fields (username, email, role, status, timestamps) in a structured detail layout with hero, stats cards, and action links.

## Key elements

- **`heroTitle` / `heroDescription`** — Computed values that fall back gracefully: username → route id → i18n page title; email → empty-value glyph.
- **`userRole` / `userStatus`** — Computed chip labels produced by `formatFlag`, mapping `admin`/`active` booleans to localized "Administrator"/"Standard User" and "Enabled"/"Disabled" strings.
- **`watchUser(() => id)`** — Store action that selects and re-fetches the user whenever the route param `id` changes.
- **`currentUser`** (from `storeToRefs(useUsersStore())`) — Reactive reference to the loaded user; `v-if="currentUser"` guards the detail grid.
- **Template slots** — Uses `ItemDetailLayout` slots (`#hero`, `#stats`, `#aside`, `#actions`) to compose `ItemDetailHero`, `CardMaterialStat` × 3, `CardDetail` with `ItemDetailField` rows, and two action buttons (Edit / Back to list) via `routerLinkI18n`.

## Relationships

- **`@/modules/users/store`** — Consumes `useUsersStore` for `watchUser` (fetch trigger) and `currentUser` (data source).
- **`@/infrastructure/i18n/router-link.ts`** — Builds i18n-aware route links for the Edit and List action buttons.
- **`@/infrastructure/utils/formatters.ts`** — `formatText`, `formatDateTime`, `formatFlag` for display normalization.
- **`@/ui/organisms/*` & `@/ui/molecules/ItemDetailField.vue`** — Provides the page layout shell and field/chip rendering.
- **`@/app/layouts/LayoutDefault.vue`** — Top-level page wrapper.

No graph-neighbor files were recorded beyond these direct imports.

## Notes

- Component name is `UserTargetPage`, **not** `User` — the file name is misleading; search by the registered name when tracing navigation or route mappings.
- The `id` prop is optional; when absent, `heroTitle` falls through to the i18n page title and the store is still called with `undefined` (behavior depends on `watchUser` internals).
- `v-chip` is used directly in the template (Vuetify global), so no explicit import is present.
- The stats row and the detail card both display role and status — intentional redundancy for the hero-area vs. body-area layout, not a duplication bug.
