# src/modules/orders/module.ts

## Purpose

Module manifest that registers the **orders** module with the app's module registry (`AppModule`). It assembles the module's routes, a single navigation entry, response schemas, and lazy-loaded locale dictionaries into one default export.

## Key elements

- **default export (`satisfies AppModule`)** — the manifest object with `name: 'orders'`, `routes`, `navigation`, `responseSchemas`, and `locales`. The `satisfies` clause type-checks against the registry contract without widening the type.
- **`routes`** — imported from `./routes`; the route table for customer order history and admin status screens.
- **`navigation[0]`** — one entry (`OrdersList`) placed in the `account` section at order 90, using the `ReceiptText` icon from `lucide-vue-next` and the i18n key `navigation.label-orders`.
- **`responseSchemas`** — re-exported from `./response-schemas` as `ordersResponseSchemas`.
- **`locales`** — two lazy loaders (`en`, `it`) that dynamically import a JSON dictionary and return its default export.

## Relationships

- **`src/modules/orders/routes.ts`** — provides the `routes` array consumed directly in the manifest.
- **`src/modules/orders/response-schemas.ts`** — provides the `ordersResponseSchemas` object consumed directly in the manifest.

## Notes

- Locales use a `.then(({ default: dictionary }) => dictionary)` pattern rather than the shorthand `import('./file').then(m => m.default)`; both are equivalent but the destructuring form is the convention here.
- The file's doc-block narrative (reorder button → cart store, `ShipmentPanel`/`PaymentPanel`) describes *other* files in the module, not behavior of this manifest. This file itself imports only `routes`, `responseSchemas`, the `AppModule` type, and the `ReceiptText` icon.
- `plural: 1` and `order: 90` are registry-side conventions for nav rendering; they are opaque to this file.
