---
source: src/modules/inventory/routes.ts
sha256: 7c541b8670a9d33686c8c9b92130db59eadb3ea97a4d60097ee69b9125ac2d80
generated_at: 2026-10-17T00:59:18.276702+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/routes.ts

## Purpose

Defines the two Vue Router route records for the inventory domain (the stock ledger and the staff preorder board). Each route lazily imports its view component so the JS bundle is only fetched on actual navigation. The file exists to centralize path, name, permission, and title metadata in one place that the inventory module registers with the app router.

## Key elements

- **Default export** — an array of two `RouteRecordRaw` objects, type-checked with `satisfies`.
  - `InventoryLedger` (`/inventory`) — renders `./views/InventoryLedger.vue`; requires `auth` + `read:StockLevel`.
  - `PreordersBoard` (`/sales/preorders`) — renders `./views/PreordersBoard.vue`; requires `auth` + `display:Order`.

## Relationships

- **`src/modules/inventory/module.ts`** — imports this default export and registers the two route records with the application router (the module is the composition root for the inventory domain).
- **`src/modules/inventory/tests/routes.spec.ts`** — imports the default export to assert path, name, permission, and lazy-load expectations.

## Notes

- The preorder board deliberately uses the `display` action on `Order` rather than `read`. The comment in-source explains that `read:Order` would also admit customers, but the board surfaces other users' fulfillment orders, so only the staff `display` action should gate access. When editing the permission string, keep this distinction in mind.
- Both `component` values are arrow-function dynamic imports (`() => import(...)`)—this is the mechanism for code-splitting; do not replace them with static imports or the lazy-load benefit is lost.
