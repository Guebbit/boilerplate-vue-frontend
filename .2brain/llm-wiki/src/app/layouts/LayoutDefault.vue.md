---
source: src/app/layouts/LayoutDefault.vue
sha256: aa68842ae730df58fa7f7bd7b8b2a8ed96f5676abe14b09b0a5c34dd85e879dd
generated_at: 2026-10-17T00:06:24.222963+00:00
model: ollama:qwen3.8:27b
---

# src/app/layouts/LayoutDefault.vue

## Purpose

The single-page application shell that the router mounts once for every route under `/:locale`. It provides the persistent chrome around `<RouterView />`: skip link, health/verification/consent banners, navigation, a default page hero, footer legal links, a dialog host, a toast stack, and two tiers of loading indicators. It deliberately preloads no domain data.

## Key elements

- **`heroTitle` / `customHero` / `centered` (computed)** — Read `route.meta.title`, `meta.customHero`, and `meta.centered` to decide whether to render the shared `PageHeader`, defer it to the view, or center the content column.
- **`skipToContent()`** — Manually focuses the `#main` element via `document.querySelector(...).focus()`; a plain hash `href` would not move focus.
- **`watch(locale, …, { immediate: true })`** — Syncs Vuetify's internal `locale`, `messages`, and `rtl` map on every app-locale change (and once on mount). Falls back to `'en'` when Vuetify has no entry for the new locale, and writes `localeDirections[newLocale]` into Vuetify's rtl map.
- **`legalLinks`** — Maps `STATIC_PAGES` through `routerLinkI18n` / `staticPageRouteName` to produce the footer cross-links (the `contentinfo` landmark).
- **`MAIN_LOADING_KEYS = ['core']`** — Drives the full-screen overlay via `useCoreStore().isLoading`. Only a module that explicitly calls `setLoading('core', …)` triggers it.
- **`SIDE_LOADING_KEYS` / `showSideLoading`** — Drives the discreet corner indicator via `useIsLoading(…, queryClient)`. Guarded by a length check so an empty module list never lights the indicator for all traffic.
- **`watch(expiredSignal, …)` / `watch(idleSignal, …)`** — On a dead or idle session: push a toast, then `router.replace` the current path with `force: true` so the route guard re-runs (sending protected pages to login with `?continue=`).
- **`normalizeAlertType(type?)`** — Coerces an arbitrary notification type string into one of `v-alert`'s four accepted values, defaulting to `'info'`.
- **`analyticsConsentEnabled` / `analyticsConsent`** — Gates the footer "Privacy choices" link and its `reopen()` call on whether Umami/Faro is configured.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Mounted once, not per view.** Because `onMounted` fires only on the very first navigation, per-route side-effects (e.g., focus handoff) live in `router/index.ts`'s `afterEach` hook, not here.
- **Vuetify rtl map is empty until this watcher fills it.** `<html dir>` alone does not affect Vuetify components; they read their own `rtl` dictionary. Until `localeDirections` is populated (post-manifest-fetch), an RTL locale is treated as LTR.
- **`<v-main tabindex="-1">`** exists solely so the skip link and the router's focus handoff can target it without polluting the tab order.
- **No domain preloading.** The session's `viewer` projection is loaded by `tryRestoreAuth` before any component mounts; the editable user record is fetched by the account view itself. Preloading domain data here would add a per-page request and couple the shell to a `User` concept.
- **`force: true` on session-expired `router.replace`** is required because Vue Router otherwise drops a navigation to the already-current URL as a duplicate, and the guard re-run is the whole point.
