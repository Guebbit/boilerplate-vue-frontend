---
source: src/modules/delivery/tests/ship-lines.spec.ts
sha256: 95788c0bf6705afe34d54594a09b2b07b9ac2561a3db113230c1a8e26ad256f6
generated_at: 2026-10-17T00:49:35.083331+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/ship-lines.spec.ts

## Purpose

Unit tests (Vitest) for the three pure helpers in the delivery domain that power the ship dialog and the "arrives in N shipments" label. Each `describe` block maps to one exported function and exercises the edge cases where typed quantities or record counts diverge from what the server would accept.

## Key elements

- **`LINES`** – module-level fixture array: two fulfillment lines (`p1` with 2 remaining, `p2` fully shipped). Shared by the `shippableLines` and `readShipLines` suites.
- **`describe('shippableLines')`** – asserts the filter keeps only lines with `remaining > 0`.
- **`describe('readShipLines')`** – asserts the parser returns `{ valid, lines }`:
  - Accepts a valid quantity and drops zero-quantity entries from the output array.
  - Rejects (via `it.each`): over-shipment, fractional, negative, zero, and empty input.
  - Silently omits lines with no remaining stock even if the user types a quantity for them.
- **`describe('shipmentCount')`** – asserts the count of physical fulfillment orders still to ship:
  - Counts distinct physical orders (ignores the `number` field on the order itself).
  - Excludes `digital`-kind and `cancelled`-status orders.
  - For a `closed` order, counts each associated shipment record (multiple shipments of one order are all included).
  - Returns 0 when the only order is digital, even if it has a delivered shipment.

## Relationships

- **`src/modules/delivery/domain/ship-lines.ts`** – the system under test; this file imports and exercises `shippableLines`, `readShipLines`, and `shipmentCount`.
- **`tests/support/unit/fixtures.ts`** – provides `aFulfillmentOrder` and `aShipment` factory helpers used to build realistic domain objects in the `shipmentCount` suite without hand-writing full object literals.

## Notes

- The `readShipLines` test for a zero quantity asserts the line is *dropped* from `lines` (not merely that `valid` stays true), which is a distinct behavior from the outright-rejection cases.
- `shipmentCount`'s second argument is the list of already-created shipment records; a `closed` fulfillment order with no shipments still counts as 1 (it hasn't been shipped yet), while one with shipments counts them individually.
- The test file uses the `.ts` extension on imports (ESM-style), consistent with the project's Vitest/NodeNext setup.
