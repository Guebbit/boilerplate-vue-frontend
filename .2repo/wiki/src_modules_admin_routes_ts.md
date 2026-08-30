# src/modules/admin/routes.ts

## Purpose

Defines the route table for the admin domain. It exports a single lazy-loaded route for the observability dashboard, gated behind the `admin` access role, so the dashboard chunk is only fetched when an admin actually navigates to `/admin`.

## Key elements

- **`default` (export)** — An array of `RouteRecordRaw` containing one route:
  - `path: 'admin'` / `name: 'Admin'`
  - `meta.access: 'admin'` — used by the router guard to restrict navigation to the `admin` role
  - `meta.title: 'admin-page.page-title'` — i18n key for the page title
  - `component` — dynamic `import()` of `@/modules/admin/views/Admin.vue` (code-split chunk)

## Relationships

- **`src/modules/admin/module.ts`** — Imports this default export and registers the route record with the application router.
- **`src/modules/admin/tests/routes.spec.ts`** — Asserts the route's path, name, meta, and lazy-load behavior.

## Notes

- The array is cast with `as RouteRecordRaw[]` rather than annotated at the variable level; keep the cast if you add routes so the tuple type stays valid.
- The `access` field in `meta` is the sole authorization mechanism for this route—there is no per-component guard. Ensure the router guard reads `meta.access` before rendering.
