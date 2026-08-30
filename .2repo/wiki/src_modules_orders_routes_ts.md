# src/modules/orders/routes.ts

## Purpose

Defines the Vue Router route table for the orders module. Each entry pairs a URL path with a lazy-loaded view component and declares the minimum access level the router guard must enforce. The array is consumed by the module registry to mount these routes under the application's shared router.

## Key elements

- **Default export** — A `RouteRecordRaw[]` containing three route records:
  - `OrdersList` (`/orders`) — lists all orders; requires `auth` access.
  - `OrderTarget` (`/orders/:id`) — single-order detail view; requires `auth`; passes `:id` as a prop via `props: true`.
  - `OrderEdit` (`/orders/:id/edit`) — order editing form; requires `admin`; also passes `:id` as a prop.
- **`meta.access`** — Machine-readable permission level (`'auth'` | `'admin'`) consumed by the global router guard.
- **`meta.title`** — i18n key (e.g. `orders-list-page.page-title`) used by the layout to render the page title.
- **Lazy component imports** — `() => import('@/modules/orders/views/…')` code-splits each view into its own chunk.

## Relationships

- **`src/modules/orders/module.ts`** — Imports this file's default export and registers the three routes with the application's module-based route registry (the file doc comment refers to "mounted under the app's module registry").
- **`src/modules/orders/tests/routes.spec.ts`** — Unit-tests the exported array: verifies route paths, names, `meta` fields, and component references.

## Notes

- Route paths are **relative** (no leading `/`); the module registry is expected to prefix them when inserting into the parent router.
- The `props: true` option is only present on parameterized routes; `OrdersList` has no params and omits it.
- `meta.access` values are compared by the router guard as a simple allow-list (`admin` implies `auth`); adding a new level requires updating both the guard and any role definitions.
- Titles are i18n keys, not literal strings — do not treat them as display text when reading the file.
