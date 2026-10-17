---
source: src/modules/inventory/module.ts
sha256: b7722dd7c4a93d452f1806df979777951da930e7c9d5145f4d493183d9db6785
generated_at: 2026-10-17T00:59:04.707892+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/module.ts

## Purpose

Module manifest for the inventory domain. It assembles the inventory routes, admin navigation entries, response-schema validators, locale loaders, and a product-form slot into a single `AppModule` object that the kernel registry picks up at app boot.

## Key elements

- **`routes`** — Re-exported from `./routes`; defines the stock ledger and preorder-board routes for this domain.
- **`navigation`** — Two admin-side entries: `InventoryLedger` (order 47, `Warehouse` icon) and `PreordersBoard` (order 58, `CalendarClock` icon, grouped under `navigation.group-sales`).
- **`responseSchemas`** — Lazy-imports `./response-schemas` and returns `inventoryResponseSchemas` for the kernel's response-validation pipeline.
- **`locales`** — Lazy-loads `en.json` / `it.json` and passes each through the kernel `dictionary` helper for i18n registration.
- **`slots['product-create-extras']`** — Registers `OpeningStockField.vue` as an async component so the product create form can render an opening-stock input without `products` importing it directly.
- **`loadingKeys`** — `['inventory']`; tells the kernel which loading-indicator key this domain owns.

## Relationships

- **`src/modules/inventory/routes.ts`** — Imported at module scope and spread verbatim into the manifest's `routes` field. This file is the sole source of route definitions consumed by the registry.

## Notes

- The `slots` entry is intentionally one-directional: `products` consumes the `product-create-extras` slot but never imports from this module, avoiding a circular dependency.
- The PreordersBoard mounts `delivery`'s second tab and reads per-product counts through the delivery barrel, but this module does not own any fulfillment logic.
- Deleting this module removes the ledger and preorder boards; shelf counts (owned by `products`) are unaffected.
