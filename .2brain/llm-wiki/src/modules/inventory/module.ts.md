---
source: src/modules/inventory/module.ts
sha256: 2031dde7095e3946e08103675e82bc52a609b6c6788503ef57279c54ea36df9e
signature: 2031dde7095e3946e08103675e82bc52a609b6c6788503ef57279c54ea36df9e
generated_at: 2026-11-10T04:31:55.212396+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/module.ts

## Purpose
Module manifest that registers the inventory domain (stock ledger + preorder board) under the kernel's `AppModule` registry. It assembles the domain's routes, nav entries, response-schema validators, locale loaders, onboarding tour steps, and a single UI slot, and exposes them as a single default export satisfying `AppModule`.

## Key elements
- **Default export (`AppModule`)** — the single object the kernel consumes; no other named exports exist.
- **`routes`** — re-exported from `./routes`; not defined here.
- **`navigation`** — two admin-section entries:
  - `InventoryLedger` (order 47, `Warehouse` icon) with a live badge from `useWorkCount('inventory')` (low-stock count).
  - `PreordersBoard` (order 58, `CalendarClock` icon, grouped under `navigation.group-sales`) with a badge from `useWorkCount('salesPreorders')` (late fulfillment count).
- **`tours`** — three ordered steps (`forms` → `board` → `ledger`) for the `stock-board` guided tour; titles/bodies are i18n keys under `inventory-tour.*`.
- **`responseSchemas`** — lazy import of `./response-schemas#inventoryResponseSchemas`.
- **`locales`** — lazy `en` / `it` JSON loaded through the kernel's `dictionary` helper.
- **`slots['product-create-extras']`** — registers `OpeningStockField.vue` as an async component injected into the product-create form; the `products` module never imports this component directly.
- **`loadingKeys`** — `['inventory']`; used by the shell to gate route resolution.

## Relationships
- **`src/modules/inventory/routes.ts`** — the sole file-level import in this module; provides the `routes` array that is passed through to the `AppModule` object unchanged.

## Notes
- The `slots` entry is the integration point with the **products** module: `products` renders the `'product-create-extras'` slot, and this module fills it with `OpeningStockField.vue`. There is no import edge between the two modules — the slot is the only coupling.
- Badges are computed via `useWorkCount`, a composable from `@/kernel/work-counts`. The two keys (`inventory`, `salesPreorders`) live in different logical domains (stock vs. sales) but both surface on this module's nav items.
- The file carries extensive doc-block comments explaining *why* the module exists (ledger-as-explanation, subdomain `supporting`) and pointing to `docs/modules/inventory.md` for the broader context map.
