---
source: src/modules/orders/routes.ts
sha256: f807faf38faf7a0563a12d618530a9203da71f8451c7b9b8e0c2253714d0493d
generated_at: 2026-10-17T01:16:03.358494+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/routes.ts

## Purpose

Defines the route table for the orders module. Each record pairs a path with a lazy-loaded Vue view and the `meta.access` / `meta.can` permissions the router guard enforces before the route is rendered.

## Key elements

- **Default export** – an array satisfying `RouteRecordRaw[]` with four route records:
  - `OrdersList` (`/orders`) – user's own orders; passes `scope: 'mine'` as a prop.
  - `SalesOrders` (`/sales/orders`) – all orders for staff; requires `can: ['display', 'Order']`; passes `scope: 'all'`.
  - `OrderTarget` (`/orders/:id`) – single-order detail view; passes route params via `props: true`.
  - `OrderEdit` (`/orders/:id/edit`) – edit view; requires `can: ['update', 'Order']`.
- All four routes share `access: 'auth'` (signed-in user required) and a `title` key for i18n.

## Relationships

- **src/modules/orders/module.ts** – Consumes this default export to register the routes under the application's module registry.
- **src/modules/orders/tests/routes.spec.ts** – Imports the route array to assert paths, names, meta fields, and prop wiring.

## Notes

- `OrdersList` and `SalesOrders` mount the **same component** (`./views/OrdersList.vue`); the only difference is the `scope` prop (`'mine'` vs `'all'`). The access control distinction lives entirely in `meta.can`.
- The comment on `SalesOrders` clarifies that `display` (not `read`) is the correct permission: every signed-in user implicitly has `read:Order` for their own orders, so `display` is what gates the staff-wide listing.
- Route names are PascalCase (`OrdersList`, `SalesOrders`, etc.) and are the canonical identifiers for programmatic navigation elsewhere in the codebase.
