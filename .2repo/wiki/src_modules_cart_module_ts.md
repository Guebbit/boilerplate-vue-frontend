# src/modules/cart/module.ts

## Purpose

Module manifest for the cart/checkout domain. Declares the module's routes, a pinned navigation entry (with a live badge and currency total), response schemas, and locale loaders, and hands the bundle to the app registry (`AppModule`). This is the single object the shell reads to wire the cart into the navigation bar and to resolve its i18n dictionaries.

## Key elements

- **Default export** — An object satisfying `AppModule` with `name: 'cart'`, `routes`, `navigation`, `responseSchemas`, and `locales`.
- **`navigation[0]` (Cart entry)** — Pinned, icon-badged nav item in the `account` section. Contains two reactive factories:
  - **`badge`** — Returns a reactive `badgeQuantity` ref. On auth (immediate + reactive), calls `cartStore.fetchSummary()` to seed the count from the lightweight `GET /cart/summary` endpoint.
  - **`detail`** — Returns a `computed` string: `formatCurrency(badgeTotal, badgeCurrency)` or `undefined` when the total hasn't loaded yet.
- **`responseSchemas`** — Re-exported from `./response-schemas`.
- **`locales`** — Lazy-import map for `en.json` and `it.json` dictionaries.

## Relationships

- **`./routes`** — Imported and passed through as the module's route table.
- **`./response-schemas`** — Imported (`cartResponseSchemas`) and re-exposed on the manifest.
- **`./store`** — `useCartStore` is consumed inside the `badge` and `detail` factories; the store's `badgeQuantity`, `badgeTotal`, `badgeCurrency`, and `fetchSummary` are the reactive contract the nav entry reads.
- **`@/infrastructure/session`** — `useSessionStore` provides `isAuth`, which gates the initial `fetchSummary` call.
- **`@/infrastructure/utils/formatters`** — `formatCurrency` renders the money string in `detail`.
- **`@/kernel/registry`** — `AppModule` type constrains the default export shape.

## Notes

- The badge is seeded from the *summary* endpoint, not a full cart fetch, so the count appears without pulling line items.
- Currency formatting lives in the nav factory (chrome layer), not in the store; the store holds raw numbers and a currency code, and `computed` re-evaluates when the active i18n locale changes.
- The module is intentionally a *consumer* of `delivery` (checkout mounts `ShippingSelector`) and a *provider* to `orders`, `products`, and `wishlist` — those modules call into this store, not the other way around.
- `badge` and `detail` are arrow functions that call Pinia stores at invocation time (inside the shell's `setup`), not at module-evaluation time.
