---
source: src/modules/orders/routes.ts
sha256: da9c7779ee4ba4e9ea5c9aebb6072ea57124826dfaa5482d8ab9018546a61ab0
signature: da9c7779ee4ba4e9ea5c9aebb6072ea57124826dfaa5482d8ab9018546a61ab0
generated_at: 2026-11-10T05:00:02.567971+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/routes.ts

## Purpose

Defines the four route records for the orders module. Each record pairs a URL path with a lazy-loaded view component and the access-control metadata (`meta.access`, `meta.can`) the router guard checks before allowing navigation.

## Key elements

- **Default export** — An array of `RouteRecordRaw` objects (asserted via `satisfies RouteRecordRaw[]`) containing four routes:
  - `orders` (`OrdersList`) — the user's own orders; passes `props: { scope: 'mine' }`.
  - `sales/orders` (`SalesOrders`) — the all-orders staff view; reuses `OrdersList.vue` with `props: { scope: 'all' }`; requires the `display` ability on `Order`.
  - `orders/:id` (`OrderTarget`) — single-order detail; `props: true` forwards route params to the component.
  - `orders/:id/edit` (`OrderEdit`) — order editing form; requires the `update` ability on `Order`.
- **`meta` fields** — `access: 'auth'` gates every route behind authentication; `can: ['<verb>', 'Order']` adds fine-grained permission checks (present on `sales/orders` and `orders/:id/edit` only).
- **Lazy loading** — Each `component` is a dynamic `import()` of the corresponding `.vue` file under `./views/`.

## Relationships

- **`src/modules/orders/module.ts`** — Consumes this file's default export and registers the routes into the application's module registry (the file's own doc comment notes it is "mounted under the app's module registry").
- **`src/modules/orders/tests/routes.spec.ts`** — Tests the route table (paths, names, meta, props, and component references) exported by this file.

## Notes

- **`display` vs `read`:** The `sales/orders` route deliberately uses the `display` ability rather than `read`, because every authenticated account implicitly holds `read:Order` for its own orders. `display` is the staff-level ability that opens the all-orders view.
- **Shared component, different scope:** `OrdersList.vue` is reused for both personal and staff views; the `scope` prop (`'mine'` | `'all'`) is the only behavioral differentiator at the route level.
- **`props: true` vs explicit object:** Detail and edit routes use `props: true` so the router automatically passes `:id` as a component prop; list routes use an explicit props object because they carry no dynamic params.
