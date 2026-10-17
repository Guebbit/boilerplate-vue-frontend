---
source: src/modules/cart/routes.ts
sha256: 6071461316cae2043597cce9e491f3f7abf5014000a5c5cbccc0d325c291dfed
generated_at: 2026-10-17T00:36:44.933405+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/routes.ts

## Purpose
Declares the cart module's route table (a single `/cart` route) that the module registry merges into the app router. The route is accessible to guests and to signed-in users who hold the `update` permission on `Cart`, lazy-loading the `CartEntry.vue` view.

## Key elements
- **`default` export** — an array satisfying `RouteRecordRaw[]` containing one route record:
  - `path: 'cart'`, `name: 'Cart'`
  - `meta.access: 'open'` — page is visible to unauthenticated visitors.
  - `meta.can: ['update', 'Cart']` — signed-in users must pass this permission check; staff who lack the permission are excluded.
  - `meta.title: 'cart-page.page-title'` — i18n key for the page title.
  - `component` — dynamic `import('./views/CartEntry.vue')`.

## Relationships
- **`src/modules/cart/module.ts`** — The module registry in this file consumes the default-exported route array and registers it under the cart module's mounted path in the app router.
- **`src/modules/cart/tests/routes.spec.ts`** — Test suite that asserts the shape and meta of the exported route record(s).

## Notes
- `access: 'open'` does **not** mean the route is unrestricted for signed-in users; `can` is still evaluated for them. Only guests bypass the permission check entirely.
- The route path is relative (`'cart'`), not absolute. It resolves against whatever base path the module registry assigns.
