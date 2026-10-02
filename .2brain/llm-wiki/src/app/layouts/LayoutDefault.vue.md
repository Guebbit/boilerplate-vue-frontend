---
source: src/app/layouts/LayoutDefault.vue
sha256: 97bebe6b1ea4aee817b6ff0a2a60e6d81d7e9d9d8e4eb0af102ad02736ef5097
generated_at: 2026-10-02T14:37:54.015078+00:00
model: ollama:qwen3.8:27b
---

# src/app/layouts/LayoutDefault.vue

## Purpose

The single layout shell the router mounts once for every route under `/:locale` (decision FA70). It provides the app chrome — skip link, health/verification/consent banners, navigation, page hero, footer, dialog host, toast stack, and two-tier loading indicators — with `<RouterView />` in the middle. It is intentionally mounted once (not per view), so lifecycle hooks like `onMounted` fire only on the very first navigation.

## Key elements

- **`skipToContent()`** — focuses the `<v-main>` element (which carries `tabindex="-1"`) for the WCAG 2.4.1 skip link; a bare `href="#main"` would only hash-navigate without moving focus.
- **`heroTitle` / `customHero` / `centered`** — computed from `route.meta`; control whether the generic `PageHeader` renders, whether the route draws its own hero, and whether the content column centers.
- **Vuetify locale watcher** (immediate) — syncs `vuetifyLocale`, `vuetifyRtl` on every app-locale change; falls back to `'en'` for locales Vuetify has no message map for, and sets the per-locale `rtl` flag from `localeDirections`.
- **`legalLinks`** — footer links built from `STATIC_PAGES` via `routerLinkI18n` / `staticPageRouteName`.
- **Two-tier loading indicators** — `isMainLoading` (full-screen overlay, keyed to `'core'`) reads `useCoreStore`; `isSideLoading` (discreet corner indicator) reads the shared `queryClient` via `useIsLoading` with each enabled module's `loadingKeys`. `showSideLoading` suppresses the corner indicator when the overlay is active or when no module declares keys.
- **Toast rendering** — reactive `messages` from `useNotificationsStore`, one `v-alert` per visible message; `normalizeAlertType` coerces free-form types to `v-alert`'s union, defaulting to `'info'`.
- **Session-expiry watcher** — on `expiredSignal` change, pushes a toast and calls `router.replace(…, { force: true })` to re-trigger the route guard (sends protected pages to login with `?continue=`, leaves public pages in place).
- **`analyticsConsentEnabled`** — gates the footer "Privacy choices" link and the `AppAnalyticsConsentBanner`; both render nothing unless Umami is configured.
- **`ReauthDialog` / `DialogHost`** — confirmation-dialog host mounted at the layout level so any page can trigger it.

## Relationships

No graph neighbors are recorded for this file. It imports from `@/app/components/*`, `@/ui/*`, `@/i18n`, `@/infrastructure/*`, `@/kernel/registry`, `@/modules`, and `@guebbit/vue-toolkit`, but none of those appear as listed neighbors in the dependency graph.

## Notes

- **Mounted once, not per view.** Focus handoff on page change lives in `router/index.ts`'s `afterEach`, not here. Adding an `onMounted` hook here will run only on the very first navigation.
- **Preloads nothing domain-specific.** The session's `viewer` projection is loaded by `tryRestoreAuth` before any component mounts; the editable user record is fetched by the account module's own view. Deliberately avoids making the shell depend on domain entities.
- **Vuetify locale fallback is explicit.** Pointing `vuetifyLocale` at an unknown locale leaves its `aria-label`s half-resolved with per-key console warnings; the code chooses `'en'` instead so the fallback is a decision, not a side effect.
- **`<v-main tabindex="-1" data-main-content>`** — the id is on the layout element (not on a per-view root) because the layout no longer changes per route (FA70). The *current* page's own semantic id lives on its own root.
- **`router.replace` uses `force: true`** — without it, a navigation to the already-displayed address is dropped as a duplicate and the route guard (which enforces auth) never re-runs.
- **`MAIN_LOADING_KEYS` is `['core']` today** — only `Playground.vue` sets that flag; app bootstrap is covered by `index.html`'s static splash, which exists before Vue (and this layout) is in the DOM.
- **`localeDirections` is empty until the i18n manifest fetches.** Until then, an RTL locale is treated as LTR both here and in `applyHtmlLocaleAttributes`; this is a known, accepted gap during the first paint.
