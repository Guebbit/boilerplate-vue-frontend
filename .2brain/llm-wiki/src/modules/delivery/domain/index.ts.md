---
source: src/modules/delivery/domain/index.ts
sha256: e887fdf0ca12bfcff9d89ed41cfad0831d8fbd993cc91253fbfff864f8e1f359
signature: e887fdf0ca12bfcff9d89ed41cfad0831d8fbd993cc91253fbfff864f8e1f359
generated_at: 2026-11-10T04:17:33.294955+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/domain/index.ts

## Purpose

Barrel file that defines the public API surface of the delivery domain layer. It re-exports the pure, framework-free shipping-rule functions and their types from `ship-lines.ts`, giving consumers a single stable import path (`delivery/domain`) while keeping internal module paths private.

## Key elements

- **`readShipLines`** *(function re-export)* — Core shipping-rule logic defined in `ship-lines.ts`.
- **`shipmentCount`** *(function re-export)* — Derives a shipment count from input lines.
- **`shippableLines`** *(function re-export)* — Filters or selects lines that qualify for shipment.
- **`ShipLineInput`** *(type re-export)* — Input shape expected by the above functions.
- **`ShipLinesVerdict`** *(type re-export)* — Output/verdict shape returned by the above functions.

## Relationships

- **`src/modules/delivery/domain/ship-lines.ts`** — Sole source of every export in this file; this index adds no logic of its own.
- **`src/modules/delivery/components/ShipItemsDialog.vue`** and **`src/modules/delivery/components/ShipmentPanel.vue`** — Presentational components that consume the domain functions/types through this barrel import, keeping the dependency direction component → domain.
- **`src/modules/delivery/tests/ship-lines.spec.ts`** — Unit tests exercising the re-exported functions (`readShipLines`, `shipmentCount`, `shippableLines`).

## Notes

- The module doc-comment declares a **hard tier boundary**: this layer must contain no Vue, Pinia, axios, or any other framework/tier imports. The constraint is enforced by lint rules (see `docs/theory/domain-layer.md`), so any re-export added here must also satisfy that restriction.
- Because this is the only public entry point, prefer importing from `delivery/domain` rather than reaching into `delivery/domain/ship-lines` directly; that keeps internal refactors (renaming or splitting `ship-lines.ts`) from breaking consumers.
