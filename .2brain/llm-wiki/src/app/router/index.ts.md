---
source: src/app/router/index.ts
sha256: adb636259544564c5a8e6a9c60efc477565152116c01a143626c893864252aad
generated_at: 2026-10-17T00:06:46.576237+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/index.ts

## Purpose

The application's central router. It assembles all routes—shell-owned pages and module-contributed domain routes collected via the kernel registry—under a `/:locale` prefix, configures global navigation guards (session restore, access enforcement, locale sync), scroll behavior, error handling, and post-navigation side effects (tab title, a11y announcement, focus management). No domain name is hard-coded here; adding or removing a domain only touches `src/modules.ts`.

## Key elements

- **`shellChildRoutes: RouteRecordRaw[]`** — The shop's own routes: Home, About, FAQ, Terms, Privacy, and a parameterised Error shell. Declared here (not in a module) because they describe the shop, not a domain.
- **`moduleRoutes`** — Result of `collectModuleRoutes(enabledModules)` from the kernel registry. Every domain route enters the app through this single call.
- **`assertUniqueRoutes([...])`** — Called at import time (before `createRouter`) to fail the build if any two routes—shell vs. shell, module vs. module, or shell vs. module—collide on name or path.
- **`localeLessRedirects`** — Auto-generated redirects for every known first-segment path (`/products`, `/orders`, etc.) that re-prefix the default locale, so a bare path doesn't get misread as a locale code.
- **`router` (created via `createRouter`)** — The exported router instance. Notable route structure:
  - `/` → redirect to Home with default locale.
  - `/oauth/callback` → redirect to `oauthCallbackLocation`, the one entry point that must exist outside `/:locale`.
  - `/:locale` → nested `LayoutDefault` wrapper → shell + module children → `:catchAll` 404.
  - Top-level `/:catchAll` → 404 for paths that don't match any known segment.
- **`scrollBehavior`** — Restores `savedPosition` on back/forward, scrolls to anchor hash, skips scroll on same-path query changes, otherwise scrolls to top. Respects `prefers-reduced-motion`.
- **`readLocaleParameter`** — Safely extracts the `:locale` param (guards against `string[]` from repeated params).
- **`router.onError`** — Reports the error to the observability store, handles stale-deploy recovery (reload-once), and redirects to a meaningful error route.
- **`registerStaleDeployRecovery(globalThis)`** — Registered at module load so the recovery hook is armed before the first lazy chunk import can fail.

## Relationships

- **`@/kernel/registry`** — Provides `collectModuleRoutes` and `assertUniqueRoutes`; the sole channel through which module routes enter the app.
- **`@/modules`** — Exports `enabledModules`, the list fed into the registry collector.
- **`@/app/guards/locale-choice`**, **`@/app/guards/authentications.ts`** — Navigation guard logic for locale and auth.
- **`@/i18n`** — `getDefaultLocale` and `translate` for locale resolution and title lookup.
- **`@/app/router/oauth-callback.ts`**, **`@/app/router/navigation.ts`**, **`@/app/router/announcer.ts`**, **`@/app/router/stale-deploy.ts`** — Focused router-adjacent utilities consumed here.
- **`@/infrastructure/observability/store.ts`** — `useObservabilityStore().captureException` in the error handler.
- **`@/app/utils/static-pages.ts`**, **`@/app/utils/branding.ts`** — `staticPageRouteName` and `brandName` for naming and tab-title suffix.
- **`@/infrastructure/utils/use-link-token.ts`** — `isAnchorHash` in `scrollBehavior`.
- **`@/app/utils/error-messages.ts`** — Error message helpers used in the error handler.

## Notes

- `assertUniqueRoutes` runs at **import time**, not at router-creation time, so a collision is a build/lint failure rather than a runtime surprise.
- The `LayoutDefault` wrapper at `path: ''` under `/:locale` is the documented vue-router nested-layout pattern; it is lazy-imported to keep the nav, banners, and dialog hosts out of the entry chunk (enforced by `entry-chunk-budget.spec.ts`).
- `scrollBehavior` returns `false` (not a scroll target) when `to.path === from.path`, preserving viewport on query-only navigations like re-filtering a list.
- The `/oauth/callback` route exists **outside** `/:locale` because the backend's `NODE_FRONTEND_URL` is an origin without a locale segment; this is the only such entry point besides the root `/` redirect.
- `router.onError` captures the error before any redirect; the `to` parameter (not `router.currentRoute`) is used for the redirect target because the failed navigation never committed.
- `appName` is derived from `brandName()` (an env value) so a derived project can rebrand the tab suffix without editing the router.
