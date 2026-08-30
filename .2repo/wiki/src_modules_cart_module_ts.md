# src/modules/cart/module.ts

## Purpose

Cart module manifest. Registers the cart/checkout module with the app registry by declaring its routes, navigation entry (including a live item-count badge), response schemas, and lazy-loaded locale dictionaries. It is the single integration point that ties the cart's internal pieces together for the shell.

## Key elements

- **Default export** — an object `satisfies AppModule` with keys `name`, `routes`, `navigation`, `responseSchemas`, `locales`.
- **`navigation[0].badge`** — returns a reactive ref to `cartStore.badgeQuantity`. Internally watches `isAuth` from the session store and calls `cartStore.fetchSummary()` (via the lightweight `GET /cart/summary` endpoint) whenever a session appears, including immediately.
- **`locales`** — two lazy dynamic imports (`en.json`, `it.json`) resolved through `.then(({ default }) => …)` for the i18n loader.
- **`routes`** / **`responseSchemas`** — re-exported from sibling files; this file adds no logic of its own to them.

## Relationships

- **`./routes.ts`** — default-imported and assigned to the manifest's `routes` key; this file performs no transformation.
- **`./response-schemas.ts`** — named import of `cartResponseSchemas`, assigned to `responseSchemas`.
- **`./store.ts`** — `useCartStore` is called inside the badge factory to expose `badgeQuantity` and to trigger `fetchSummary()` on auth.

## Notes

- The badge factory runs in the shell's `setup` context (not in a component), so Pinia stores are directly accessible; no component instance is required.
- `watch` is imported from **Vue** (not a store helper) and used with `{ immediate: true }`, meaning the summary fetch fires synchronously on the first render if the user is already authenticated.
- The module's JSDoc block documents the dependency-direction convention: most other modules (orders, products, wishlist) point *into* cart, while cart points *out* to `delivery` only via the mounted `ShippingSelector` component.
- Locale files are loaded as plain JSON (`import(...).then`), not as ES module named exports.
