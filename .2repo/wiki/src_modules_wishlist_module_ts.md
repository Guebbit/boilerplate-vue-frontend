# src/modules/wishlist/module.ts

## Purpose

Module manifest for the **wishlist** feature. It registers the module's routes, navigation entry, response schemas, and locale loaders with the app registry (`AppModule`) so the application can discover and mount the wishlist without hard-coding its details.

## Key elements

- **`export default`** — An object satisfying `AppModule` that bundles:
  - `name: 'wishlist'`
  - `routes` — imported from `./routes`; the wishlist's route table.
  - `navigation[0]` — A nav item (icon `Heart`, label key `navigation.label-wishlist`, order `75`, section `'account'`).
  - `responseSchemas` — imported as `wishlistResponseSchemas` from `./response-schemas`.
  - `locales` — Lazy loaders for `en.json` and `it.json` via dynamic `import()`.

## Relationships

- **`src/modules/wishlist/routes.ts`** — Imported and attached to the manifest's `routes` field; this is the sole route definition for the module.
- **`src/modules/wishlist/response-schemas.ts`** — Imported (`wishlistResponseSchemas`) and passed through as the manifest's `responseSchemas`; consumed by the registry for response validation.

## Notes

- The module's domain boundary is intentionally **one-directional**: wishlist → cart (via a "move to cart" action that triggers a cart *refetch*). The cart never reads the wishlist, keeping the dependency chain `products → wishlist → cart → orders` acyclic. The cart store is asked to *refetch*, not to write, so the wishlist module owns the write.
- `locales` are defined as arrow functions returning a `Promise` (dynamic import), so dictionary JSON files are loaded only when the app requests them.
- The `plural: 1` on the navigation entry is a registry convention (likely controls label pluralization); its meaning is defined in the `AppModule` type, not here.
