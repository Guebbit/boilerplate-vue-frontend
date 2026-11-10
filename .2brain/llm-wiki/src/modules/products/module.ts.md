---
source: src/modules/products/module.ts
sha256: 3621dac9089bc36b5f06ddfc149443ee5685c4989de94381112d54fe010751ce
signature: 3621dac9089bc36b5f06ddfc149443ee5685c4989de94381112d54fe010751ce
generated_at: 2026-11-10T05:21:09.956028+00:00
model: ollama:qwen3.8:27b
---

# src/modules/products/module.ts

## Purpose

Module manifest for the **products** domain. Registers the catalogue's routes, a navigation entry, response schemas, and locale files into the app's module registry (`AppModule`). It is the single wiring point that makes the products feature visible to the framework.

## Key elements

- **Default export** — an object satisfying `AppModule`:
  - `name: 'products'`, `loadingKeys: ['products']`
  - `routes` — imported from `./routes.ts`
  - `navigation` — one entry (`ProductsList`) in the `main` section, order 60, `Package` icon
  - `responseSchemas` — lazy-loads `productsResponseSchemas` from `./response-schemas`
  - `locales` — lazy-loads `en.json` / `it.json` through the `dictionary` helper
- **JSDoc block** — documents the module's contribution-slot design (`product-actions` slot), its one outward dependency (`delivery` for release-date confirmation), and the client/server responsibility split (client = browsing, server = prices). Points to `docs/modules/products.md` for the full context map.

## Relationships

- **`src/modules/products/routes.ts`** — imported directly and re-exported as the `routes` field on the module manifest. This is the only static import in the file; the module has no other runtime dependencies.

## Notes

- The module is intentionally **inbound-only**: `cart` and `wishlist` contribute buttons into the product page's `product-actions` slot and read data back via the `useProductLines` barrel, but this manifest imports nothing from them. The dependency arrows point *into* products, not out.
- The sole outbound call lives in `composables/use-release-date-confirm.ts`, which asks the `delivery` module and degrades gracefully if it fails. It is not referenced from this file.
- `responseSchemas` and `locales` are lazy (`import()`), so they load on demand rather than at bootstrap.
