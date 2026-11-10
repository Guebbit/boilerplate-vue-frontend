---
source: src/modules/wishlist/routes.ts
sha256: 20d0fce291c037b4fef68286dd0cd22b38fd1f437afa97acda713b2cf0cfe0d6
signature: 20d0fce291c037b4fef68286dd0cd22b38fd1f437afa97acda713b2cf0cfe0d6
generated_at: 2026-11-10T06:19:06.153399+00:00
model: ollama:qwen3.8:27b
---

# src/modules/wishlist/routes.ts

## Purpose

Defines the single route record for the wishlist module so the app router can mount it under the module's registered path. It exists to decouple route declarations from the module bootstrap and to give the wishlist view a lazy-loaded, authenticated entry point.

## Key elements

- **default export (route array)** — A single-element array of `RouteRecordRaw` objects. Declares one route:
  - `path: 'wishlist'` — the segment appended to the module's base path.
  - `name: 'Wishlist'` — programmatic-navigation identifier.
  - `meta.access: 'auth'` — signals the router guard that authentication is required.
  - `meta.title` — i18n key (`wishlist-page.page-title`) for the page title.
  - `component` — lazy import of `./views/Wishlist.vue`.
- **`satisfies RouteRecordRaw[]`** — enforces Vue Router's route-record shape at compile time while preserving the literal array type for downstream consumers.

## Relationships

- **`src/modules/wishlist/module.ts`** — Registers this file's default export with the module registry, which in turn merges the route into the global app router.
- **`src/modules/wishlist/tests/routes.spec.ts`** — Unit-tests the route table exported here (path, name, meta, component reference).

## Notes

- The `path` value is **relative** (`'wishlist'`, no leading slash). The full URL depends on whatever base path the module registry assigns in `module.ts`.
- The component is a dynamic `import()`, so the Vue SFC is only fetched when the route is actually navigated to.
- `meta.access: 'auth'` is a convention consumed by a global `beforeEach` guard; it is not enforced by Vue Router itself.
