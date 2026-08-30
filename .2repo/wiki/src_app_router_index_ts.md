# src/app/router/index.ts

## Purpose

Creates and configures the application's Vue Router instance. It assembles locale-prefixed routes (`/:locale/…`), merges all domain routes in through the kernel registry (`collectModuleRoutes(enabledModules)`), and registers the global guard chain (auth restore → access enforcement → locale choice) plus post-navigation side effects (tab title, a11y announcement, focus management). This file names no domain itself; enabling or removing a domain is entirely a matter of `src/modules.ts`.

## Key elements

- **`moduleRoutes`** — result of `collectModuleRoutes(enabledModules)`; the single insertion point for every domain's routes.
- **`appName`** — read from `VITE_APP_NAME` (fallback `'Guebbit'`); appended to every page's `document.title`.
- **`prefersReducedMotion()`** — re-reads `matchMedia('(prefers-reduced-motion: reduce)')` on each call so the OS setting can change at runtime.
- **`router`** — the `createRouter` instance (history mode, `VITE_APP_BASE_URL`). Owns the route table, `scrollBehavior`, and all global guards.
- **`scrollBehavior`** — restores saved position on back/forward, scrolls to hash anchors, and only resets to top on a genuine path change. Chooses `'smooth'` vs `'auto'` per the reduced-motion preference (WCAG 2.3.3).
- **`readLocaleParameter`** — safely extracts the `:locale` param as `string | undefined` (guards against repeated-param arrays).
- **`router.onError`** — global navigation-failure handler. Reports to the observability store, then redirects: 401 → sign-in (preserving the aborted target via `to.fullPath`); 403 → dedicated "forbidden" copy; other client errors → their status; 5xx/unknown → generic 500.
- **`router.beforeEach`** — chains `tryRestoreAuth()` → `enforceRouteAccess(to)`. Order is load-bearing: the profile must be restored before the access check reads it.
- **`router.beforeResolve`** — runs `localeChoice` (from `@/app/guards/locale-choice`) to load the correct i18n dictionary.
- **`router.afterEach`** — sets `document.title`, writes `routeAnnouncement`, and (only on a real page change) requests + consumes main focus.
- **`export default router`** — the sole export; consumed by the app bootstrap.

## Relationships

- **`src/kernel/registry.ts`** — provides `collectModuleRoutes`, the function that turns the enabled-modules list into a flat route array consumed by this file's route table.
- **`src/app/guards/authentications.ts`** — provides `tryRestoreAuth` and `enforceRouteAccess`, both called from the `beforeEach` hook.
- **`src/main.ts`** — imports and installs the default-exported router into the Vue application instance.
- **`tests/cross-cutting/a11y-coverage.spec.ts`** — exercises the post-navigation a11y behaviours (announcement, focus management) that this file establishes in `afterEach`.
- **`docs/getting-started.md` / `docs/index.md`** — reference the router's locale-prefixed URL scheme and the module-registry pattern documented here.

## Notes

- **Guard ordering is load-bearing.** `tryRestoreAuth` must resolve *before* `enforceRouteAccess` runs, and `localeChoice` (in `beforeResolve`) must settle *before* `afterEach` calls `translate`. Reordering any of these silently breaks auth or i18n.
- **`onError` uses `to`, not `router.currentRoute`.** The navigation was aborted, so `currentRoute` still points at the page being left. Using it sent logged-in users back to where they already were.
- **Focus is suppressed on anchors and query-only navigations.** A list re-search (`?page=2`) must keep focus on the control the user just operated (WCAG 2.4.3); an anchor target must receive native browser focus.
- **Page views are not tracked here.** The Umami script hooks `history` changes globally; adding a manual `page_view` call would double-count.
- **Static pages (`about`, `faq`, `terms`, `privacy`) are declared by the shell, not a module**, because they describe the shop itself rather than a domain.
