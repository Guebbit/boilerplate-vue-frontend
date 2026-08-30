# src/modules/cart/routes.ts

## Purpose

Declares the route table for the cart module. It exports a single authenticated route record that the app router mounts under the module's registered path, separating routing concerns from the module's service/store logic.

## Key elements

- **default export** (`RouteRecordRaw[]`) — An array containing one route:
  - `path: 'cart'` / `name: 'Cart'`
  - `meta.access: 'auth'` — requires an authenticated session
  - `meta.title: 'cart-page.page-title'` — i18n key for the page title
  - `component` — lazy-loaded import of `@/modules/cart/views/Cart.vue`

## Relationships

- **`src/modules/cart/module.ts`** — The module registry imports this default export and merges it into the application router under the module's registered path.
- **`src/modules/cart/tests/routes.spec.ts`** — Test suite that validates this route table.

## Notes

- The array is cast with `as RouteRecordRaw[]` because the literal object shape is not structurally assignable to the full `RouteRecordRaw` union without an explicit assertion.
- The `title` in `meta` is an i18n key, not a plain string; the consuming header/nav component is expected to resolve it.
