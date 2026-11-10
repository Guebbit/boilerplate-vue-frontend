---
source: src/modules/inventory/routes.ts
sha256: 7c541b8670a9d33686c8c9b92130db59eadb3ea97a4d60097ee69b9125ac2d80
signature: 7c541b8670a9d33686c8c9b92130db59eadb3ea97a4d60097ee69b9125ac2d80
generated_at: 2026-11-10T04:32:09.908987+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/routes.ts

## Purpose

Declares the route table for the inventory domain. It defines two lazy-loaded page routes (the stock ledger and the staff preorder board) so their Vue components are only bundled on navigation, and attaches per-route access/permission metadata consumed by the router guard.

## Key elements

- **Default export** — An array of `RouteRecordRaw` objects, type-checked via `satisfies` (no widening).
- **`InventoryLedger`** — Path `inventory`. Requires `auth` + `read:StockLevel`. Loads `./views/InventoryLedger.vue`.
- **`PreordersBoard`** — Path `sales/preorders`. Requires `auth` + `display:Order`. Loads `./views/PreordersBoard.vue`. The `display` action (rather than `read`) is deliberate: it restricts access to staff who can act on fulfillment orders, not general customers who only read them.

## Relationships

- **`src/modules/inventory/module.ts`** — Consumes this file's default export to register the inventory domain's routes into the application router.
- **`src/modules/inventory/tests/routes.spec.ts`** — Unit-tests the route definitions (paths, names, meta, component references) exported here.

## Notes

- The `satisfies RouteRecordRaw[]` assertion gives full type-checking while preserving the literal array shape; it does **not** cast or widen the type.
- The `meta.can` entries use an action-entity pair (e.g. `['read', 'StockLevel']`) rather than a single permission string. The preorder board's inline comment documents why `display` was chosen over `read`—a non-obvious security decision worth preserving if the guard logic is refactored.
- Both routes sit under `auth`, meaning the router guard must resolve the user before `can` is evaluated; unauthenticated visitors never see these paths.
