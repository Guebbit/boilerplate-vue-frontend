---
source: src/modules/delivery/index.ts
sha256: 81913896d6ddf68038c2dcbc7585903804c2c5c8082c5d966c44c33e814f2aa9
signature: 81913896d6ddf68038c2dcbc7585903804c2c5c8082c5d966c44c33e814f2aa9
generated_at: 2026-11-10T04:18:01.076300+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/index.ts

## Purpose

Public barrel for the delivery module. It re-exports exactly four Vue components and one read-only composable, and nothing else. Consumers (cart, orders, the preorder board in `inventory`) import from this single path rather than reaching into subdirectories.

## Key elements

- **`ShippingSelector`** — component; mounted by cart context, fetches its own shipping-rate state.
- **`ShipmentPanel`** — component; mounted by orders context, fetches its own parcel state.
- **`ShippingMethodName`** — presentational component (display name for a shipping method).
- **`PreorderFulfillmentTable`** — read-only component; the second tab of the preorder board page.
- **`usePreorderSummaries`** — read-only composable; supplies state counts to the product table on the preorder board. Neither this composable nor `PreorderFulfillmentTable` performs writes.

## Relationships

This file is the sole public entry point for all five neighbors listed below; each is a direct `export { default as … }` or named re-export from this barrel. No other file in the delivery module is exposed externally.

## Notes

- The delivery **store is deliberately not exported** here. The rationale (per the file header): if a store were also published, consumers would have a second, wider path to the same data, and the wider path always wins. Components fetch their own state, so callers never need to know what a shipping rate is.
- The public surface is intentionally minimal: four components + one composable. Adding a new export here is a deliberate API decision, not a convenience re-export.
