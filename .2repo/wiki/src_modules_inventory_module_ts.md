# src/modules/inventory/module.ts

## Purpose

Module manifest for the inventory domain. Assembles routes, navigation entry, response-schema validators, and locale loaders from sibling files and registers the combined object under the kernel's `AppModule` interface so the inventory board and stock ledger become discoverable in the app shell.

## Key elements

- **default export (`satisfies AppModule`)** — The single registered manifest for the `inventory` domain. Contains:
  - `name: 'inventory'` — the domain key used by the registry.
  - `routes` — re-exported from `./routes`; defines the ledger/receipt pages.
  - `navigation` — one admin-section entry (`InventoryLedger`, order 47, `Warehouse` icon, i18n label `navigation.label-inventory`).
  - `responseSchemas` — the `inventoryResponseSchemas` object pulled from `./response-schemas`; consumed by the kernel for response validation.
  - `locales` — lazy `import()` loaders for `./locales/en.json` and `./locales/it.json`.

## Relationships

- **`./routes`** (`src/modules/inventory/routes.ts`) — Imported and passed through as the `routes` field; the file itself defines no route logic.
- **`./response-schemas`** (`src/modules/inventory/response-schemas.ts`) — `inventoryResponseSchemas` is imported and attached to the manifest's `responseSchemas` field for kernel-level validation.
- **`@/kernel/registry`** — Provides the `AppModule` type that shapes the exported object (type-only import).

## Notes

- The docblock references a `products` store (`useProductsStore`) and a one-way dependency the inventory pages have on the products barrel for naming items in the receipt select and ledger titles. That import does **not** appear in this file; it lives in the route components under `./routes`.
- Locale loaders return the JSON default export via `.then(({ default }) => …)`; consumers should treat the value as a flat key-value dictionary, not a module namespace.
- The `satisfies AppModule` keyword enforces shape without widening the literal types, so adding an extra field here will surface as a type error rather than being silently absorbed.
