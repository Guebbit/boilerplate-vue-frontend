---
source: src/modules/stock-alerts/module.ts
sha256: 32430e1542cdcef41ce98b2d00d0c455b5dbb53f4a3e5485dffeecbecc455371
signature: 32430e1542cdcef41ce98b2d00d0c455b5dbb53f4a3e5485dffeecbecc455371
generated_at: 2026-11-10T05:54:38.274317+00:00
model: ollama:qwen3.8:27b
---

# src/modules/stock-alerts/module.ts

## Purpose
Module manifest for the "stock-alerts" feature (back-in-stock / "Notify me" requests). It registers the module's name, navigation entry, locales, response schemas, and a lazy button contributed to the `product-actions` slot, so the rest of the app (e.g. `products`) never needs to import this feature directly.

## Key elements
- **Default export (`AppModule`)** — the manifest object; satisfies the `AppModule` type from `@/kernel/registry`.
- **`name: 'stock-alerts'`** — unique module identifier.
- **`loadingKeys: ['stock-alerts']`** — keys consumed by the kernel's lazy-loading layer.
- **`routes`** — imported from `src/modules/stock-alerts/routes.ts` and attached to the manifest for the router to pick up.
- **`navigation`** — one entry (`StockAlerts`) placed in the **account** section at order 76, with a `Bell` icon and a locale label key.
- **`responseSchemas`** — async factory that lazy-imports `./response-schemas` and returns `stockAlertsResponseSchemas`.
- **`locales`** — async factories for `en` and `it` JSON files, passed through the shared `dictionary` helper from the kernel registry.
- **`slots['product-actions']`** — contributes `NotifyMeButton.vue` via `defineAsyncComponent`, keeping it out of the eager entry chunk.

## Relationships
- **`src/modules/stock-alerts/routes.ts`** — imported at module top-level; its default export is assigned to the manifest's `routes` field so the kernel router registers the stock-alerts pages.

## Notes
- The slot contribution is the primary integration point: `products` renders whatever is registered under `product-actions`, so `stock-alerts` stays fully decoupled. Deleting the folder removes the button but breaks nothing else.
- All heavy artifacts (locales, schemas, the button component) are async/lazy; nothing here adds to the initial bundle beyond the `Bell` icon and the routes object.
- Subdomain is tagged `supporting` (see the doc comment); the detailed context map lives at `docs/modules/stock-alerts.md` § "The map".
