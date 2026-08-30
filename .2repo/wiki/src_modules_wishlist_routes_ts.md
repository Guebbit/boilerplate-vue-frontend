# src/modules/wishlist/routes.ts

## Purpose

Declares the route table for the wishlist module—a single authenticated route that is merged into the application's Vue Router by the module registry. It exists to decouple the module's navigation entry point from the central router configuration.

## Key elements

- **`default` export (route array, typed as `RouteRecordRaw[]`)** — A single route record:
  - `path: 'wishlist'`, `name: 'Wishlist'`
  - `meta.access: 'auth'` — gate the route behind authentication.
  - `meta.title: 'wishlist-page.page-title'` — i18n key consumed by a layout/title watcher.
  - `component` — lazy-loads `@/modules/wishlist/views/Wishlist.vue` via dynamic `import()`.

## Relationships

- **`src/modules/wishlist/module.ts`** — Imports this route array and registers it with the app router (the "module registry" referenced in the file's doc comment).
- **`src/modules/wishlist/tests/routes.spec.ts`** — Tests the exported route record (path, name, meta, component resolution).

## Notes

- The array is cast with `as RouteRecordRaw[]` because the object literal's `meta` shape is wider than what `RouteRecordRaw`'s generic parameter expects by default; the cast silences the excess-property check.
- The component is never imported statically—rely on the dynamic `import()` for code-splitting. Any static import of `Wishlist.vue` here would defeat the lazy-load boundary.
- `meta.title` is an i18n key, not a literal string. Adding a new route here requires a matching translation entry under the `wishlist-page` namespace.
