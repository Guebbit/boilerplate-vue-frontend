---
source: src/modules/inventory/tests/routes.spec.ts
sha256: e90a1963185b9b5980a5a4640c3f1923ccf464b459bca1e78b649997f3e52c4c
signature: 80ba74e07580eb1dd5344a530f266c81581b1ea72219e98615c81971bac7651d
generated_at: 2026-11-10T04:35:44.486112+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/tests/routes.spec.ts

## Purpose

Pins the `meta.access` and `meta.can` declarations on every inventory route by name, asserting the exact values rather than deriving them. It exists to catch a route that silently loses its access declaration (making it indistinguishable from a public one) and to flag any new route added without an explicit access decision.

## Key elements

- **`byName(name)`** — Local lookup helper; finds a `RouteRecordRaw` in the imported `routes` array by its `name` property. Returns `undefined` if no match.
- **`it.each` block** — Table-driven assertions for `InventoryLedger` (`auth` + `read StockLevel`) and `PreordersBoard` (`auth` + `display Order`). Each row checks `meta.access` is a string and `meta.can` is the exact `[action, subject]` pair (or `undefined`).
- **"opens the preorder board only on the staff action" test** — Asserts `PreordersBoard` uses `display` rather than `read`, since `read:Order` would admit a customer and the board lists other people's orders.
- **"declares no route this file does not know about" test** — Exhaustive guard: asserts the sorted list of all route names equals exactly `['InventoryLedger', 'PreordersBoard']`. Any new route added to the module will fail this test until an access decision is recorded here.

## Relationships

- **`src/modules/inventory/routes.ts`** — Sole source dependency. The spec imports the raw `routes` array (not a resolved router instance) and asserts on its declarations directly. No other module is imported.

## Notes

- Tests run against the static `RouteRecordRaw[]`, not a mounted app or resolved router. No locale prefix or app bootstrap is needed.
- The `meta.can` assertion uses `toEqual` (deep equality) so the order of the `[action, subject]` tuple matters and an extra element would fail.
- The exhaustive-name test is intentionally strict: adding a third route to the module breaks this spec until a corresponding access row is added to the `it.each` table and the expected-names array is updated.
- The `display` vs `read` distinction is a deliberate security choice, not a naming preference — see the inline comment in the PreordersBoard test.
