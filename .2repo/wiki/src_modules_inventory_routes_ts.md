# src/modules/inventory/routes.ts

## Purpose

Declares the Vue Router route table for the inventory domain. It exposes a single admin-only route (`/inventory`) that lazy-loads the `InventoryLedger.vue` view, so the component's code is excluded from the main bundle until navigation actually occurs.

## Key elements

- **`default` export** — An array satisfying `RouteRecordRaw[]` containing exactly one route record:
  - `path: 'inventory'` / `name: 'InventoryLedger'`
  - `component` — a dynamic `import()` of `./views/InventoryLedger.vue`
  - `meta.access: 'admin'` — gates the route behind the admin role
  - `meta.title: 'inventory-page.page-title'` — i18n key used for the page title

## Relationships

- **`src/modules/inventory/module.ts`** — Imports this file's default export and registers the route with the application's router (or passes it into a module-level route collection). This is the sole consumer of the exported array.

## Notes

- The file exports a raw array, not a named function. Consumers should treat it as an opaque `RouteRecordRaw[]` and spread it into their route list rather than importing individual entries.
- The `satisfies RouteRecordRaw[]` annotation provides type-checking without widening the literal (keeps `meta` keys precise) while still conforming to Vue Router's expected shape.
