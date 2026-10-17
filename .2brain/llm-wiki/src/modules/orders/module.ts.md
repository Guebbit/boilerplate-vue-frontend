---
source: src/modules/orders/module.ts
sha256: 4445fb4480821624ff7c661bad6174322a37e2a119a21d182144c85bd415fd51
generated_at: 2026-10-17T01:15:48.836573+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/module.ts

## Purpose

Module manifest that registers the **orders** module into the app's module registry. It wires together the route table, two navigation entries (customer "Orders" and admin "Sales Orders"), a slot contribution to the payments page, lazy response schemas, and locale dictionaries so the rest of the app can discover and mount order-related functionality without importing individual files.

## Key elements

- **Default export** (`AppModule`): the manifest object, type-checked with `satisfies AppModule`.
- **`routes`** — re-exported from `./routes`; the module's route definitions.
- **`navigation`** — two entries:
  - `OrdersList` (account section, order 90, `ReceiptText` icon)
  - `SalesOrders` (admin section, `group-sales`, order 55, `ClipboardList` icon)
- **`slots`** — fills the `payments-awaiting-transfer` slot with an async `AwaitingTransferTable.vue`, letting the payments page render orders that are awaiting transfer.
- **`responseSchemas`** — lazy-imports `./response-schemas` and extracts `ordersResponseSchemas`.
- **`locales`** — `en` and `it` JSON dictionaries, lazy-loaded through the `dictionary` helper from the kernel registry.
- **`loadingKeys`** — `['orders']`; used by the app's loading/preload mechanism.

## Relationships

- **`src/modules/orders/routes.ts`** — the sole static import in this file; its default export is assigned directly to the manifest's `routes` field.

## Notes

- Cross-module UI interactions described in the block doc (reorder via `cart`, `WithdrawalPanel` from `returns`, `RecordOfflinePaymentForm` from `payments`) happen inside this module's **view components**, not in this manifest. The manifest only registers; it does not call other modules' operations.
- The `slots` entry is a **provider** edge: this module supplies a component *into* the payments page, rather than consuming it.
- `responseSchemas` and `locales` are thunk-based lazy imports to keep initial bundle weight low.
