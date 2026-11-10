---
source: src/modules/products/routes.ts
sha256: 6afa7a80e20a3b48029aff2d35db4c38fc0056c378316df6dc3eaedf2eddba04
signature: 6afa7a80e20a3b48029aff2d35db4c38fc0056c378316df6dc3eaedf2eddba04
generated_at: 2026-11-10T05:21:39.908948+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/routes.ts

## Purpose

Declares the four route records for the products domain (list, create, detail, edit) and exports them as a typed `RouteRecordRaw[]` array for consumption by the module manifest and the app router.

## Key elements

- **`export default`** — an array of four `RouteRecordRaw` objects, type-checked via `satisfies RouteRecordRaw[]`.
  - `ProductsList` — `/products`, public, lazy-loads `views/ProductsList.vue`.
  - `ProductCreate` — `/products/create`, requires auth + `create` on `Product`, lazy-loads `views/ProductCreate.vue`.
  - `ProductTarget` — `/products/:id`, public detail view, lazy-loads `views/ProductTarget.vue`, passes route params as component props (`props: true`).
  - `ProductEdit` — `/products/:id/edit`, requires auth + `update` on `Product`, lazy-loads `views/ProductEdit.vue`, also `props: true`.
- All routes set `meta.title` to an i18n key for the page heading.

## Relationships

- **`src/modules/products/module.ts`** — imports this file's default export and registers the routes into the module's manifest, which the app router merges.
- **`src/modules/products/tests/routes.spec.ts`** — imports the default array and asserts route shapes (paths, names, meta, component loaders) in unit tests.

## Notes

- Route ordering is intentional: `products/create` is listed before `products/:id` purely for readability. vue-router's static-segment-over-dynamic-segment ranking makes the order functionally irrelevant, but the comment and position make the intent obvious to a reader without knowledge of that rule.
- `props: true` appears only on the two `:id` routes; the list and create routes do not expect route params as props.
- Permission guards (`access`, `can`) live in `meta` and are enforced by a router-level navigation guard elsewhere, not by this file.
