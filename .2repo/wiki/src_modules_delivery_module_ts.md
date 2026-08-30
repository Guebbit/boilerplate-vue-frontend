# src/modules/delivery/module.ts

## Purpose

App-module manifest for the `delivery` module. It registers the module's response schemas and locale dictionaries with the kernel registry without defining any routes — shipping (methods, parcels) is exposed as components consumed by the cart and orders modules, not as standalone pages.

## Key elements

- **Default export** — a plain object typed via `satisfies AppModule` (from `@/kernel/registry`).
  - `name`: `'delivery'`
  - `routes`: `[]` — intentionally empty; no navigation entries.
  - `responseSchemas`: `deliveryResponseSchemas` imported from `./response-schemas`.
  - `locales`: lazy `en` and `it` dictionaries loaded via dynamic `import()` of `./locales/{lang}.json`.

## Relationships

- **`src/modules/delivery/response-schemas.ts`** — provides `deliveryResponseSchemas`, the sole value import in this file; the manifest forwards it to the kernel registry.
- **`@/kernel/registry`** — supplies the `AppModule` type that constrains the shape of the manifest.
- Consumed downstream by the **cart** and **orders** modules, which mount the delivery components (selector, parcel panel) through this module's barrel.

## Notes

- The module is deliberately **route-less**. Deleting it removes the shipping selector and parcel panels; checkouts lose shipping support but the app keeps functioning.
- Locale loaders return the JSON `default` export via a `.then()` chain — they are async functions, not static values.
- The `satisfies AppModule` syntax gives compile-time shape checking without widening the object's inferred type.
