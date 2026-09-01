# Mobile Fixes

Backlog from a mobile-friendliness audit of the app (2026-09-01). Shell/layout/nav are solid;
gaps cluster around data-heavy pages and test coverage. Ordered by impact.

## P1 — Data tables have no mobile handling

`src/ui/organisms/DataTable.vue` wraps `v-data-table` with no `mobile-breakpoint` and no
card-view fallback. Wide tables (users: 8 cols, movement ledger: 7 cols) rely solely on
Vuetify's internal horizontal scroll inside the table wrapper — usable, not a real mobile UX.

Affected views:

- `src/modules/products/views/ProductsList.vue`
- `src/modules/orders/views/OrdersList.vue`
- `src/modules/users/views/UsersList.vue`
- `src/modules/inventory/components/MovementLedger.vue`, `StockBoard.vue`
- `src/modules/locales/views/LocalesDictionary.vue`, `LocaleEntries.vue`, `LocalesList.vue`
- `src/modules/admin/components/AdminAuditTab.vue`

Fix: add a card-list fallback to `DataTable.vue` below a breakpoint (e.g. via
`useDisplay().mobile`), or at minimum set `mobile-breakpoint` and confirm Vuetify's built-in
stacked-row mode reads acceptably for each table's columns.

## P1 — No mobile-viewport test coverage on table pages

`tests/e2e/specs/*` and `src/modules/*/tests/e2e/*` never set a phone viewport for the module
pages listed above, so mobile-only overflow/layout regressions in those tables aren't caught in
CI. Only two specs run at a phone size (390×844):

- `tests/e2e/specs/keyboard.cy.ts`
- `tests/support/e2e/a11y-sweep.ts` (home page only)

`tests/e2e/specs/resilience.cy.ts` asserts no horizontal page overflow, but only at the default
1280×800 desktop viewport (`cypress.config.ts`).

Fix: add a `cy.viewport('iphone-x')` (or equivalent 390-ish width) pass to the per-module a11y
specs, or extend `resilience.cy.ts`'s overflow check to also run at a phone viewport.

## P2 — No `useDisplay()` usage anywhere

All responsiveness is Tailwind-CSS-only (`lg:hidden` / `hidden lg:flex` in
`src/app/components/AppNavigation.vue`); Vuetify's `useDisplay()` composable is never used in
`src/`. Fine as-is for show/hide chrome, but blocks JS-conditional mobile UX (e.g. swapping a
table for a card list based on breakpoint — needed for the P1 fix above).

## P2 — Vuetify vs. Tailwind breakpoint mismatch

`src/styles/main.css` pins Tailwind's `lg` to 1280px to mirror Vuetify's grid, but Vuetify itself
has no `display.thresholds` override in `src/ui/vuetify/index.ts`, so its actual `lg` starts at
1264px — a 16px gap between the two systems' "desktop" boundary. Low impact today since
`VRow`/`VCol` aren't used anywhere (layout is Tailwind grid/flex only), but will bite if Vuetify's
own breakpoint-aware components (`useDisplay`, `VRow`/`VCol`) are adopted later without also
setting `display: { thresholds }` in the Vuetify config.

## P3 — Dialogs never go fullscreen on mobile

No dialog uses the `fullscreen` prop. Current dialogs are capped at modest `max-width`s
(480–640px, e.g. `src/modules/locales/components/EntriesImportDialog.vue` at 640px), so nothing
overflows today, but content-heavy dialogs would benefit from `fullscreen` (or
`fullscreen="$vuetify.display.mobile"`-style binding once `useDisplay()` is adopted) if their
content grows.

## P3 — Small touch targets on row actions

Row-action buttons in list views (`view`/`edit`/`delete`/`hard-delete`, e.g.
`src/modules/products/views/ProductsList.vue`) use `size="small"` (~32px), under the 44px WCAG
touch-target recommendation. Mitigated by carrying visible text labels rather than being bare
icons, but worth bumping to Vuetify's default size on small screens if reports of mis-taps come
in.
