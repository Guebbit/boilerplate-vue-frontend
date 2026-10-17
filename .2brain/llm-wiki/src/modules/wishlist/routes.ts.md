---
source: src/modules/wishlist/routes.ts
sha256: 20d0fce291c037b4fef68286dd0cd22b38fd1f437afa97acda713b2cf0cfe0d6
generated_at: 2026-10-17T01:54:32.432029+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/routes.ts

## Purpose

Declares the wishlist module's route table (a single authenticated route) for consumption by the app-level router. It exists so the module can register its own path without the app router hard-coding module-specific routes.

## Key elements

- **`export default`** – An array of one `RouteRecordRaw` object:
  - `path: 'wishlist'` — URL segment (resolved under the module's registered base path).
  - `name: 'Wishlist'` — Named route for programmatic navigation.
  - `meta.access: 'auth'` — Signals the router guard that this route requires authentication.
  - `meta.title: 'wishlist-page.page-title'` — i18n key for the page title.
  - `component` — Lazy-loaded `Wishlist.vue` via dynamic `import()`.
  - The array is type-checked with `satisfies RouteRecordRaw[]` (preserves literal types while validating against Vue Router's type).

## Relationships

- **`src/modules/wishlist/module.ts`** — Consumes this default export and registers the route with the application's module registry / router.
- **`src/modules/wishlist/tests/routes.spec.ts`** — Unit-test suite that asserts the shape and values of the exported route table.

## Notes

- `meta.title` holds an **i18n key**, not a literal string; the consuming component or layout component is responsible for resolving it.
- The route is intentionally singular; if additional sub-routes are added, keep the array as the single default export so `module.ts`'s registration logic continues to work unchanged.
