---
source: src/modules/cart/routes.ts
sha256: 1fc6f364ad029474a647b8a588f9aa83d3bf966df35b041b762923d344dd5719
generated_at: 2026-10-02T14:59:00.959738+00:00
model: ollama:qwen3.8:27b
---

# src/modules/cart/routes.ts

## Purpose
Declares the cart module's single Vue Router route record. The array is consumed by the module registry (`module.ts`) and merged into the app-level router under the module's registered base path.

## Key elements
- **`default` export** — an array of one `RouteRecordRaw` object (validated via `satisfies RouteRecordRaw[]`):
  - `path: 'cart'` — the sub-path appended after the module's base.
  - `name: 'Cart'` — the named-route identifier used for programmatic navigation.
  - `meta.access: 'auth'` — signals the router guard that an authenticated session is required.
  - `meta.title: 'cart-page.page-title'` — i18n key for the page title.
  - `component` — lazy-imports `@/modules/cart/views/Cart.vue` for code-splitting.

## Relationships
- **`src/modules/cart/module.ts`** — imports this default export and registers it with the app router (the JSDoc references "merged into the app router by the module registry").
- **`src/modules/cart/tests/routes.spec.ts`** — unit-tests the shape/values of the exported route record(s).

## Notes
- The route is the **only** entry in the array; there are no child or nested routes here.
- `satisfies` (not `as`) is used, so the literal type is preserved for downstream consumers while still being checked against `RouteRecordRaw[]`.
- The `title` in `meta` is an i18n key, not a plain string — ensure the key `cart-page.page-title` exists in the locale files or the UI will render the raw key.
