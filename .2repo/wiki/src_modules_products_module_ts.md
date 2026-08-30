# src/modules/products/module.ts

## Purpose

Module manifest for the **products** domain. It bundles the routes, a navigation entry, response schemas, and lazy-loaded locale dictionaries into a single object that conforms to the `AppModule` interface, so the app's registry can discover and mount the products feature in one place.

## Key elements

- **Default export** (`satisfies AppModule`) — the manifest object itself.
  - `name: 'products'` — registry key.
  - `routes` — re-exported from `./routes`; the public list/detail plus admin create/edit pages.
  - `navigation[0]` — a single nav item (`ProductsList`) placed in the `main` section at `order: 60`, labelled via i18n key `navigation.label-products-list`, with `plural: 2` and the `Package` icon (lucide-vue-next).
  - `responseSchemas` — re-exported from `./response-schemas`; the `productsResponseSchemas` object.
  - `locales` — lazy loaders for `en` and `it` JSON dictionaries under `./locales/`.

## Relationships

- **`./routes.ts`** — imported and assigned to the `routes` field; this file is purely the manifest, all route definitions live in the sibling file.
- **`./response-schemas.ts`** — imported (`productsResponseSchemas`) and assigned to the `responseSchemas` field.
- **`@/kernel/registry`** — provides the `AppModule` type used with `satisfies` to guarantee the manifest's shape without widening it.

## Notes

- The docstring documents a **one-way data-flow convention**: the catalogue page *writes* into cart and wishlist stores (add-to-cart, heart), but cart/wishlist never read catalogue data through client code — they go through the server. This is a deliberate architectural boundary, not an implementation detail.
- `plural: 2` on the navigation entry is a registry-level config (likely controls pluralisation or grouping in the nav bar); it is not standard DOM `plural` semantics.
- Locales use `import().then()` rather than top-level imports, so locale JSON is code-split and loaded on demand.
