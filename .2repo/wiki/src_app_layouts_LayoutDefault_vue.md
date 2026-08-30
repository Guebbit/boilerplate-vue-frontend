# src/app/layouts/LayoutDefault.vue

## Purpose

The single application shell every view renders through. It provides the skip link, health banner, navigation, page hero, footer, confirmation-dialog host, toast stack, and full-page/activity loading indicators. It deliberately preloads no domain-specific data—only the layout chrome and its accessibility scaffolding live here.

## Key elements

- **`skipToContent()`** – Click handler for the skip link; programmatically focuses the `<v-main>` element (queried via `data-main-content`) rather than relying on a hash anchor, because the router intercepts `#` navigation and would not move focus.
- **`consumeMainFocus`** (imported from `@/app/router/announcer.ts`) – Called in `onMounted`; satisfies the router's "focus main content after navigation" request. This layout is the component that owns the focusable main region.
- **`vuetifyLocale` / `vuetifyMessages` sync** – A `watch` on the i18n `locale` sets Vuetify's internal locale, falling back to `'en'` for locales Vuetify has no bundled messages for (e.g. runtime-added locales). Prevents per-key console warnings and half-resolved `aria-label`s.
- **`legalLinks`** – Computes footer links for the four prose pages (`about`, `faq`, `terms`, `privacy`) using `routerLinkI18n` with the `'Static' + Capitalized` route naming convention.
- **`normalizeAlertType(type?)`** – Maps arbitrary/missing notification type strings to the four `v-alert` types, defaulting to `'info'`.
- **`loadings` / `isLoading`** (from `useCoreStore`) – Drives the full-page `v-overlay` loader (bootstrapping) and the discreet corner loader (background activity).
- **`messages` / `hideMessage`** (from `useNotificationsStore`) – Feeds the toast stack; each alert uses `v-if` (not `v-show`) so re-shown toasts are re-inserted into the DOM and re-announced by screen readers.
- **Props** – `title?: string` (hero heading) and `centered?: boolean` (min-height centered content).
- **Slots** – `default` (page content), `header` (replaces the hero), `navigation` (injected into `AppNavigation`).

## Relationships

No graph neighbors recorded.

## Notes

- **`data-main-content` instead of an `id`** – The view's own `id` arrives via `$attrs` (e.g. `id="cart-page"`) and would overwrite a layout-supplied `id`. Using a `data-*` attribute avoids the collision; the skip link and `consumeMainFocus` both query `data-main-content`.
- **`inheritAttrs: false`** – The layout forwards `$attrs` explicitly onto `<v-main>`, so the router-provided `id` lands on the main region, not the outer `<v-app>`.
- **Toast accessibility pattern** – The wrapper is `role="region"`, *not* `aria-live`. Each individual `v-alert` carries `role="alert"` (error) or `role="status"` (others), giving per-toast urgency. A single live-region wrapper would announce all toasts at the same priority and would fail to re-announce a hidden-then-shown toast.
- **No domain data fetching** – The viewer projection is restored by `tryRestoreAuth` before any component mounts; the editable user record is fetched by the account view itself. The shell never imports or queries a `User` entity.
- **Progress circular labels** – Both `v-progress-circular` elements carry their own `aria-label` even when a parent already provides one, because the progressbar is a distinct accessible object that must be individually named.
