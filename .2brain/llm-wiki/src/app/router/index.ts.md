---
source: src/app/router/index.ts
sha256: f8454bac8a2afeecf21a83a79b0a4293a8e3f6cc186bb6b786265e00ba39e993
signature: f7c97d8ff5a1792e66b08303c6b3e6bfa1dac4f82f5c5d7363022159b3c15733
generated_at: 2026-11-10T02:55:54.330565+00:00
model: ollama:qwen3.8:27b
---

# src/app/router/index.ts

## Purpose

The application's single Vue Router instance. It wires together locale-prefixed routing, module-contributed domain routes (collected via the kernel registry, so this file names no domain), global navigation guards (session restore, `meta.access` enforcement, i18n locale sync), scroll behaviour, accessibility announcements, stale-deploy recovery, and the top-level 404/redirect shells that belong to the app shell rather than any module.

## Key elements

- **`moduleRoutes`** — result of `collectModuleRoutes(enabledModules)`; every domain route enters the router through this one call.
- **`shellChildRoutes`** — the shell's own `/:locale` children: Home, five prose pages (About, FAQ, Terms, Privacy, Legal), and the generic `Error` shell. Declared here because they describe the shop, not a domain.
- **`assertUniqueRoutes`** — runs at import time, before the router is built, to fail the build if any module route collides with a sibling module or a shell route by name or path.
- **`localeLessRedirects`** — auto-generated redirect routes that catch first-segment paths (`/products`, `/about`, …) served without a locale prefix and re-issue them under the default locale.
- **`router`** — the `createRouter` instance. Uses `createWebHistory(import.meta.env.BASE_URL)`. Route tree: `/` → Home, `/oauth/callback` → OAuth redirect, `localeLessRedirects`, `/:locale` (nested `LayoutDefault` → children), and a top-level catch-all 404.
- **`scrollBehavior`** — restores saved position on back/forward, scrolls to anchor hashes, preserves position on same-path query changes (re-search), otherwise scrolls to top. Smooth unless the OS prefers reduced motion.
- **`readLocaleParameter`** — safe reader for the `:locale` route param; returns `undefined` when the param is absent or an array.
- **`router.onError`** — global navigation-error handler: reports to the observability store, invokes stale-deploy recovery, and redirects to a meaningful route (using `to`, not `router.currentRoute`).
- **`registerStaleDeployRecovery`** — called at module load so the recovery hook is armed before the first lazy import can fail.
- **`appName`** — `brandName()` value appended to every page's tab title; env-driven so derived projects can rename without editing the router.

## Relationships

No graph neighbors were recorded for this file. The dependency graph lists no adjacent nodes.

## Notes

- This file intentionally names **no domain**. All domain routes arrive through `collectModuleRoutes`; a module coupling violation is caught by `eslint.config.ts`'s generated `moduleCouplingRules`, not here.
- `import.meta.env.BASE_URL` (Vite's `base`) is used for `createWebHistory`, not `VITE_APP_BASE_URL`, because vue-router would misinterpret the latter as a full origin.
- `LayoutDefault` is lazy-imported specifically to keep nav, banners, and dialog hosts out of the entry chunk (enforced by `entry-chunk-budget.spec.ts`).
- The `Error` route's `meta` uses `customHero: true` and `centered: true` so `Error.vue` renders its own `PageHeader` in a full-height centered layout, distinct from the standard page flow.
- `router.onError` redirects using the `to` argument, not `router.currentRoute`, because the failed navigation was never committed and `currentRoute` still points at the page being left.
