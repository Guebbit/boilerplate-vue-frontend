---
source: src/app/layouts/LayoutDefault.vue
sha256: 88ebe732202596d02ecd2bfc31b91a18b479c95917c4897c86d8d7d00d1747ef
signature: 66e5e1d3649f375d2504fa21ef6031c1fe135edff8117ea888ee622965cb5224
generated_at: 2026-11-10T02:55:10.223663+00:00
model: ollama:qwen3.8:27b
---

# src/app/layouts/LayoutDefault.vue

## Purpose

The single layout shell the router mounts once for every route under `/:locale`. It provides the persistent chrome around the matched page—skip link, health/consent/staff banners, navigation, page hero, footer, dialog hosts, toast stack, and dual loading indicators—with `<RouterView />` in the middle for the actual page content. Because it is mounted only on the very first navigation (not per view), per-route side-effects like focus handoff live in `router/index.ts`'s `afterEach` instead of here.

## Key elements

- **`heroTitle` / `customHero` / `centered`** – Computed values read from `route.meta` that drive the generic hero, opt-out to a view-supplied hero, and centered-column layout (used by `Error.vue`).
- **`skipToContent`** – Imperatively focuses the `MAIN_CONTENT` element; a bare `href` would hash-navigate without moving focus.
- **`vuetifyLocale` / `vuetifyRtl` watch** – Keeps Vuetify's internal locale strings and RTL direction in sync with the app locale; falls back to `'en'` for locales Vuetify lacks, and maps `localeDirections` into Vuetify's `rtl` record.
- **`MAIN_LOADING_KEYS` / `SIDE_LOADING_KEYS`** – Two-tier loading: the full-screen overlay reacts only to the `'core'` key (hand-set for true blocking), while the discreet corner indicator reacts to the union of all enabled modules' `loadingKeys`.
- **`isMainLoading` / `isSideLoading` / `showSideLoading`** – Computed flags; `showSideLoading` is false when no module declares keys (avoids `useIsLoading` treating an empty list as "all resources").
- **`expiredSignal` / `idleSignal` / `abilitiesSignal` watchers** – React to session death, idle timeout, or permission re-evaluation by showing a toast and force-replacing the current route so the access guard re-runs.
- **`legalLinks`** – Maps `STATIC_PAGES` to i18n-aware router links for the footer.
- **`analyticsConsent` / `operatorLine`** – Footer "Privacy choices" link (only when Umami/Faro is configured) and the operator legal/VAT line from `publicConfig`.
- **`messages` / `hideMessage` / `normalizeAlertType`** – Toast queue rendered as `v-alert` elements with a type coercion fallback to `'info'`.
- **`CENTERED_CLASSES`** – Tailwind utility string for the centered column (`60dvh` min-height, not `vh`, to avoid mobile URL-bar displacement).

## Relationships

No graph neighbors are registered for this file in the dependency graph. In practice it imports and renders a wide set of app components (`AppNavigation`, `AppHealthBanner`, `AppVerificationBanner`, `AppStaffEnrollmentBanner`, `AppAnalyticsConsentBanner`, `DialogHost`, `ReauthDialog`, `IdleSessionDialog`, `AppTourHost`, `PageHeader`) and reads from several stores (`useCoreStore`, `useSessionStore`, `useNotificationsStore`, `useAnalyticsConsentStore`) and the shared `queryClient`.

## Notes

- The layout **preloads nothing** domain-specific. The session `viewer` is fetched by `tryRestoreAuth` before first mount; editable user records are fetched lazily by the account module's own view.
- `onMounted` fires only on the very first navigation (the layout is mounted once, not per view). Any per-route focus or scroll logic must live in the router's `afterEach` hook.
- `showSideLoading` guards against an empty `SIDE_LOADING_KEYS` list: `useIsLoading` with an empty prefix reads *every* resource, which would light the indicator for all traffic in a build where no module opts in.
- The `locale` watch uses `{ immediate: true }` so the very first render already has Vuetify in sync, not just subsequent locale switches.
- `expiredSignal` and `idleSignal` use `router.replace(…, { force: true })` because a non-forced navigation to the same path is dropped as a duplicate and the guard would not re-run.
