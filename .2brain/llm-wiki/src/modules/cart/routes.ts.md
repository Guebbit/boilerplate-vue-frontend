---
source: src/modules/cart/routes.ts
sha256: 3113d870158d7f579d664a3ff89c78c263769ec0f95730f0e53499d2b70b0361
signature: 3113d870158d7f579d664a3ff89c78c263769ec0f95730f0e53499d2b70b0361
generated_at: 2026-11-10T03:59:34.114216+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/routes.ts

## Purpose

Defines the cart module's single route record so the app router can serve the `Cart.vue` view under the module's registered path. It exists to keep route declarations co-located with the module and to declare the access policy (open) at the routing layer.

## Key elements

- **`default` (export)** — A `RouteRecordRaw[]` containing one entry:
  - `path: 'cart'`, `name: 'Cart'`
  - `meta.access: 'open'` — no authentication required; guests and all signed-in accounts may access.
  - `meta.title` — i18n key `cart-page.page-title`.
  - `component` — lazy-loaded `./views/Cart.vue`.
  - Typed via `satisfies RouteRecordRaw[]` (preserves literal types while checking against the router type).

## Relationships

- **`src/modules/cart/module.ts`** — Imports this default export and merges it into the app router under the module's registered base path.
- **`src/modules/cart/tests/routes.spec.ts`** — Exercises the exported array (path, name, meta, access policy).

## Notes

- The route is intentionally open to guests because an unauthenticated user's cart lives in the browser until sign-in; no permission check is performed at this layer.
- The `satisfies` operator (not `: RouteRecordRaw[]`) is used so that literal values like `access: 'open'` remain narrow in consuming code while still passing the structural check.
