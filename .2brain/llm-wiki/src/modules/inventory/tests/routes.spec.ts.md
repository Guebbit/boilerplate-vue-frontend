---
source: src/modules/inventory/tests/routes.spec.ts
sha256: e90a1963185b9b5980a5a4640c3f1923ccf464b459bca1e78b649997f3e52c4c
generated_at: 2026-10-17T01:01:19.645243+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` declarations on every inventory route by name, using the module's own route records directly. It complements the router-level spec (which proves enforcement is *attached*) by proving the declarations are *there*—a route that silently loses `meta.access` is indistinguishable from a public one.

## Key elements

- **`byName(name)`** – Local helper that searches the imported `routes` array for a record whose `name` matches; returns the record or `undefined`.
- **`it.each([...])`** – Parameterised test asserting each known route's `meta.access` string and `meta.can` array (e.g. `InventoryLedger` → `access: 'auth'`, `can: ['read','StockLevel']`; `PreordersBoard` → `access: 'auth'`, `can: ['display','Order']`).
- **"opens the preorder board only on the staff action on orders"** – Focused test that `PreordersBoard` uses `display` (not `read`) on `Order`, because `read:Order` would let a customer see others' preorders.
- **"declares no route this file does not know about"** – Exhaustiveness guard: the sorted list of all route names must equal exactly `['InventoryLedger', 'PreordersBoard']`, so any newly added route fails the suite until an access decision is written down.

## Relationships

- **`src/modules/inventory/routes.ts`** – The sole import target. This spec reads the raw `RouteRecordRaw[]` export from that file and asserts on the `meta` fields of each record. No mock or resolved router is involved; the relationship is a direct data read.

## Notes

- Expected `meta` values are written out as literals rather than derived from a shared constant, so a silent removal of a declaration is caught by value mismatch, not by a shared reference going `undefined`.
- The exhaustiveness test (`toSorted` on both sides) means adding a new route to `routes.ts` without extending this spec will break the build—it is an intentional "you must make an access decision" gate.
- The file deliberately avoids importing the app's resolved router or locale prefix; it only needs the static array exported by the module.
