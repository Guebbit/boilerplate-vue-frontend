# src/modules/products/routes.ts

## Purpose

Defines the four route records for the products domain (list, create, detail, edit). This array is the single source of truth for the module's navigation entries and is consumed by the module manifest, which merges it into the application-level router.

## Key elements

- **`export default`** — An array of four `RouteRecordRaw` objects, typed via an `as` assertion. Each entry maps a `path` to a lazily-imported Vue SFC and a `meta` object.
  - `products` → `ProductsList.vue` (public)
  - `products/create` → `ProductCreate.vue` (admin)
  - `products/:id` → `Product.vue` (public, `props: true`)
  - `products/:id/edit` → `ProductEdit.vue` (admin, `props: true`)
- **`meta.title`** — An i18n key (e.g. `products-list-page.page-title`) used by the shell to render the page title.
- **`meta.access: 'admin'`** — A guard flag read elsewhere in the app to restrict create/edit routes to admin users.
- **`props: true`** — On the two `:id` routes, tells vue-router to inject the `id` param as a component prop.

## Relationships

- **`src/modules/products/module.ts`** — Imports this default array as part of the module manifest that registers the routes with the app router.
- **`src/modules/products/tests/routes.spec.ts`** — Asserts on the shape, paths, names, and meta of the exported route records.

## Notes

- `products/create` is deliberately declared **before** `products/:id`. vue-router's static-over-dynamic ranking makes the ordering functionally irrelevant, but the comment explains that the ordering is kept for readability consistency with the users module and so a reader need not know the ranking rules.
- Component imports are all dynamic (`() => import(...)`), so each view is code-split by the bundler.
- The array is a plain default export (not a named export); consumers should `import routes from './routes'`.
