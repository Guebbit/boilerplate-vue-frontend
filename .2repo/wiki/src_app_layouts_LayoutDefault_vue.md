# src/app/layouts/LayoutDefault.vue

## Purpose

The universal page shell that every view renders through. It provides the skip link, health banner, navigation, page hero, footer with legal links, a confirmation-dialog host, a toast stack, and two loading indicators — while deliberately preloading no domain-specific data.

## Key elements

- **Props** — `title?` (default hero heading) and `centered?` (min-height, centered content wrapper).
- **Slots** — `default` (page body), `header` (replaces the hero), `navigation` (extra nav content).
- **`skipToContent()`** — Programmatically focuses `[data-main-content]` because a bare `#main` hash would only trigger router navigation, not a focus change.
- **Locale sync (`watch` on `locale`)** — Keeps Vuetify's `useLocale().current` in step with the app locale; falls back to `'en'` for locales Vuetify has no messages for, avoiding per-key console warnings and half-resolved `aria-label`s.
- **`legalLinks`** — Derived from `STATIC_PAGES` + `staticPageRouteName`, rendered in the footer so every page carries a `contentinfo` landmark.
- **`normalizeAlertType()`** — Coerces arbitrary notification types to the four `v-alert` variants, defaulting to `'info'`.
- **Toast stack** — Renders `v-alert` per visible message from `useNotificationsStore`; uses `v-if` (not `v-show`) so re-shown alerts are re-inserted and re-announced by screen readers.
- **Full-page loader** — `v-overlay` bound to `loadings.core`, shown during app bootstrap.
- **Corner activity loader** — `v-progress-circular` visible when `isLoading` is true but core loading has finished.
- **`defineOptions({ inheritAttrs: false })`** — Attrs (e.g. `id="cart-page"`) are forwarded explicitly to `<v-main>` via `v-bind="$attrs"`, not to the `<v-app>` root.

## Relationships

No graph neighbors are registered for this file. It imports from `@/app/components/AppNavigation.vue`, `@/app/components/AppHealthBanner.vue`, `@/ui/organisms/DialogHost.vue`, `@/infrastructure/i18n/router-link.ts`, `@/app/utils/static-pages.ts`, `@/app/router/announcer.ts`, and the `@guebbit/vue-toolkit` stores (`useCoreStore`, `useNotificationsStore`), but none of those are tracked as graph neighbors.

## Notes

- **`data-main-content` instead of `id`** on `<v-main>`: a view's own `id` arrives through `$attrs` and would overwrite a static one. The skip link queries the data attribute so it never points at nothing.
- **Skip link uses `@click.prevent` + `focus()`** rather than letting the browser follow the hash — a hash navigation goes through the router and does not move focus, defeating the purpose of the link.
- **`tabindex="-1"` on `<v-main>`** makes it programmatically focusable (skip link, router announcer) without entering the tab order.
- **Toast wrapper is `role="region"`, not `aria-live`**: each alert carries its own `role="alert"` (error) or `role="status"` (rest) so severity is preserved per message; a single live region would announce all toasts at equal urgency.
- **No data fetching in the layout**: the viewer projection is loaded by `tryRestoreAuth` before first navigation; the editable user record is fetched by the account view. Keeping the shell domain-agnostic avoids a request per page load for signed-in users.
- **Both progress indicators are explicitly `aria-label`ed** because `role="progressbar"` requires an accessible name, and the full-page one is the only visible content during boot.
