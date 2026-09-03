# src/modules/admin/routes.ts

## Purpose

Defines the route table for the admin domain. Contains a single lazy-loaded, access-gated route record that exposes the observability dashboard to users with the `admin` role. It exists so that the dashboard bundle is only fetched when an authenticated admin navigates to `/admin`.

## Key elements

- **Default export** — A `RouteRecordRaw[]` array with one entry:
  - `path: 'admin'`, `name: 'Admin'`
  - `meta.access: 'admin'` — gates the route to the admin role (consumed by whatever guard reads `meta.access`).
  - `meta.title` — i18n key `admin-page.page-title`.
  - `component` — dynamic `import()` of `@/modules/admin/views/Admin.vue`, deferring bundle load until navigation.

## Relationships

- **`src/modules/admin/module.ts`** — Parent module file that imports this default export and registers the route with the application router.
- **`src/modules/admin/tests/routes.spec.ts`** — Test suite that asserts the shape, meta, and lazy-load behavior of this route table.

## Notes

- The array is explicitly cast `as RouteRecordRaw[]` even though it contains a single literal object; the cast ensures structural compatibility with `vue-router`'s type without widening to `any`.
- Route access control relies entirely on the `meta.access` string — there is no inline guard in this file. The enforcement mechanism lives wherever routes are consumed (likely a global `beforeEach` in `module.ts` or app-level router config).
