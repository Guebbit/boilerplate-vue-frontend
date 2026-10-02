---
source: src/app/router/index.ts
sha256: bf8f9079cd1a6a17883259da3913a62fd1cf41a364e15a98fc53454dff626e71
generated_at: 2026-10-02T14:38:31.842846+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/index.ts

## Purpose

Creates the application's Vue Router instance. It assembles locale-prefixed routes (`/:locale/...`), merges domain routes contributed by enabled modules through the kernel registry, and wires up global navigation guards (auth session restore, `meta.access` enforcement, i18n locale sync), scroll behavior, tab-title/a11y announcement, and a stale-deploy recovery path. This file names no domain route itself; all domain routes arrive via `collectModuleRoutes(enabledModules)`.

## Key elements

- **`shellChildRoutes: RouteRecordRaw[]`** — The app's own static routes: `Home`, `About`, `FAQ`, `Terms`, `Privacy`, and the `Error` shell (`/error/:status/:message?`). Owned by the shell, not a module.
- **`moduleRoutes`** — Result of `collectModuleRoutes(enabledModules)`; every domain route enters the router through this single call.
- **`assertUniqueRoutes([...shellChildRoutes, ...moduleRoutes])`** — Runs at import time (before `createRouter`); throws if two routes share a name or path, whether the collision is between modules or between a module and a shell route.
- **`localeLessRedirects`** — Generated redirects for first-segment paths that lack a locale prefix (e.g. `/products` → `/:locale/products`). Declared ahead of `/:locale` so they take precedence over the locale param.
- **`router`** — The `createRouter` instance. Uses `createWebHistory(import.meta.env.BASE_URL)`. Route tree: `/` redirect → `/oauth/callback` redirect → `localeLessRedirects` → `/:locale` (nested-layout pattern with `LayoutDefault`) → top-level 404 catch-all.
- **`scrollBehavior`** — Restores `savedPosition` on back/forward, scrolls to anchor if present, stays put on query-only changes, otherwise scrolls to top. Uses `'auto'` when `prefers-reduced-motion: reduce` is set.
- **`readLocaleParameter`** — Safely extracts `:locale` from `params` (guards against `string[]` from repeated params).
- **`router.onError`** — Reports the error to the observability store, handles stale-deploy chunk reload, and redirects to a meaningful route using the `to` argument (not `router.currentRoute`, since the navigation was aborted).
- **`registerStaleDeployRecovery(globalThis)`** — Called at module load so the recovery mechanism is armed before the first lazy import can fail.

## Relationships

No graph neighbors are listed. Key dependencies visible in imports:

- `@/kernel/registry` (`collectModuleRoutes`, `assertUniqueRoutes`) — sole entry point for domain routes.
- `@/modules` (`enabledModules`) — determines which modules contribute routes.
- `@/app/guards/authentications.ts` (`tryRestoreAuth`, `enforceRouteAccess`) — global `beforeEach` guards.
- `@/app/guards/locale-choice` (`localeChoice`) — locale resolution guard.
- `@/app/router/oauth-callback.ts`, `@/app/router/navigation.ts` — redirect targets.
- `@/app/router/announcer.ts` — `afterEach` a11y focus/announcement.
- `@/app/router/stale-deploy.ts` — stale chunk recovery logic.
- `@/i18n` (`getDefaultLocale`, `translate`) — locale defaults and tab-title translation.

## Notes

- `createWebHistory` receives `import.meta.env.BASE_URL` (Vite's path), **not** `VITE_APP_BASE_URL` directly — vue-router would interpret the latter as a full origin.
- The `/oauth/callback` route sits outside `/:locale` because the backend's `NODE_FRONTEND_URL` names an origin, not a locale-prefixed path.
- The empty-path child under `/:locale` renders `LayoutDefault.vue` (which contains its own `<RouterView>`); all page components are its grandchildren. This is the nested-layout pattern that mounts the shell layout once per locale context rather than per page.
- `localeLessRedirects` are only generated for segments the app actually serves (filters out `''` and param paths like `:id`), so `/nonsense` still falls through to the unsupported-locale / 404 path.
- The `onError` redirect target uses the `to` parameter, not `router.currentRoute`, because the failed navigation was never committed — `currentRoute` still points at the page being left.
- `appName` is sourced from `brandName()` (an env-driven value) so derived projects can rename the browser tab without editing this file.
