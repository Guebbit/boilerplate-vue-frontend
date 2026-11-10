---
source: src/modules/delivery/tests/ship-lines.spec.ts
sha256: 14a19d3f23adb34cd32fb17481ddf81880ea2d607b7e3fddf5218dea0b0bcce2
signature: b199cfeaa40a5944fe7bf6d03b4b9fc0f00acf78bc549d522507b0ae13c1dda4
generated_at: 2026-11-10T04:20:20.187149+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/ship-lines.spec.ts

## Purpose
Unit tests for the three pure helpers (`shippableLines`, `readShipLines`, `shipmentCount`) that power the ship dialog and the "arrives in N shipments" UI line. Each test case exercises a way the user-typed quantities or record counts can disagree with what the server would accept.

## Key elements
- **`LINES`** – Module-level constant fixture: two product lines (`p1` with 2 remaining, `p2` fully shipped). Shared by the `shippableLines` and `readShipLines` suites.
- **`describe('shippableLines')`** – Verifies that only lines with `remaining > 0` are returned.
- **`describe('readShipLines')`** – Validates parsing of user-typed quantity strings: happy-path extraction, rejection of over-quantity / fractional / negative / zero / empty inputs (via `it.each`), and exclusion of lines that already have nothing remaining.
- **`describe('shipmentCount')`** – Confirms the count of physical fulfillment orders still to ship, exclusion of digital/canceled orders, stability when a parcel departs, and correct handling of multiple shipments on one group.

## Relationships
- **`src/modules/delivery/domain/index.ts`** – Re-export barrel; the test imports `readShipLines`, `shipmentCount`, and `shippableLines` from here (rather than reaching into `ship-lines.ts` directly).
- **`src/modules/delivery/domain/ship-lines.ts`** – The implementation under test; all three functions are defined there and re-exported through the domain barrel.
- **`tests/support/unit/fixtures.ts`** – Provides the `aFulfillmentOrder` and `aShipment` factory helpers used to build fulfillment-order and shipment objects with sensible defaults, keeping the `shipmentCount` suite concise.

## Notes
- The test file imports fixtures via a relative path that climbs four directories (`../../../../tests/…`). If this file is ever moved, that path must be adjusted.
- `readShipLines` tests mutate the input array with a spread (`[...LINES, { … }]`) to avoid aliasing the shared `LINES` constant.
- The `it.each` table for invalid inputs is the canonical list of rejection reasons; adding a new guard in the domain function should be paired with a new row here.
