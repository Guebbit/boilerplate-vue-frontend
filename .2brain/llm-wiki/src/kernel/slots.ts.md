---
source: src/kernel/slots.ts
sha256: 76ec3a750da02079e4a155cf1bbf275ed6150ba8e643566c6a927e9beea9d7cb
generated_at: 2026-10-17T00:13:53.252652+00:00
model: ollama:qwen3.8:27b
---

# src/kernel/slots.ts

## Purpose

Defines the slot-based extension-point system: a module *owns* a named slot in one of its views, and other modules *contribute* components to it via their manifest. This inverts the dependency (contributor → owner) so that, e.g., a cart module can place "Add to cart" on the product page without `products` importing the cart.

## Key elements

- **`SlotName`** (type) — Closed union of the four slot names: `product-actions`, `product-create-extras`, `app-bar`, `payments-awaiting-transfer`. Each name's doc comment lists the props the owner passes to contributors.
- **`Slots`** (type) — `Partial<Record<SlotName, Component[]>>`; the shape of the collected contributions (slot name → array of components, in module order).
- **`SLOTS_KEY`** (const) — Vue `InjectionKey<Slots>`; the key under which the composition root provides the collected map.
- **`useSlot(name)`** (const arrow) — Reads `SLOTS_KEY` via `inject` and returns the component array for `name`, defaulting to `[]` when nothing is provided or no module contributes.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- A slot only earns a name here when a *second* module needs one (see `docs/theory/layers.md`). Do not add speculative names.
- The kernel (this file) intentionally has no knowledge of Pinia or of what a slot's components do; it only types and re-exports the injection key.
- Contributors own their own visibility. Example: `app-bar` contributions are mounted for guests too, so each component guards its own rendering.
- `product-create-extras` receives a `registerAfterCreate` callback (not a product field), which is how `inventory` injects its opening-stock step without being a product attribute.
- `payments-awaiting-transfer` is filled by `orders` (which reads ORDERS), not by `payments`, preserving the contributor → owner direction.
