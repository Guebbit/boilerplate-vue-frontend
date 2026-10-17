---
source: src/modules/products/routes.ts
sha256: 2ab119273258ec9ea09f6bcdadea6a021cddbd9491f48c36e8095accb30e6f74
generated_at: 2026-10-17T01:28:43.237296+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/routes.ts

## Purpose

Defines the four route records for the products domain (public list & detail, auth-gated create & edit) and exports them as a typed array (`satisfies RouteRecordRaw[]`) so the module manifest can merge them into the application router.

## Key elements

- **Default export** – an array of four `RouteRecordRaw` entries:
  - `ProductsList` (`/products`) – public list view; i18n title via `meta.title`.
  - `ProductCreate` (`/products/create`) – requires `auth` + `can: ['create','Product']`; declared *before* the `:id` route for readability (vue-router ranks static over dynamic regardless of order).
  - `ProductTarget` (`/products/:id`) – public detail view; `props: true` passes `:id` as a component prop.
  - `ProductEdit` (`/products/:id/edit`) – requires `auth` + `can: ['update','Product']`; also `props: true`.
- All components are lazy-loaded via `() => import('./views/*.vue')`.

## Relationships

- **`src/modules/products/module.ts`** – The module manifest imports this default export and registers the routes with the app router.
- **`src/modules/products/tests/routes.spec.ts`** – Tests assert the route table's shape, paths, names, and meta fields.

## Notes

- Route order is intentional for readability but not functionally required; vue-router's static-over-dynamic ranking guarantees `products/create` will not be captured by `products/:id`.
- Access-control metadata (`meta.access`, `meta.can`) is consumed by a global navigation guard, not by the route definitions themselves.
- Titles use i18n keys (`*.page-title`) rather than literal strings.
