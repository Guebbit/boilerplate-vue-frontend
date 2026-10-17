---
source: tests/support/unit/fixtures.ts
sha256: 8a4b42ae085e2e76bbac0406f184fec529ec1c092e64cad59be82c3252c760b4
generated_at: 2026-10-17T02:28:36.964604+00:00
model: ollama:qwen3.8:27b
---

# tests/support/unit/fixtures.ts

## Purpose

Typed factory functions that produce valid, schema-conformant instances of contract entities (Order, Payment, FulfillmentOrder, Shipment, etc.) for use in unit test specs. They are typed against the generated contract types in `@types`, so any field the contract adds or makes required becomes a compile-time error in every consuming spec simultaneously, rather than a runtime parse failure discovered late in a single test.

## Key elements

- **`anOrder(overrides?)`** — valid empty `Order`; all totals zero, status `pending`/`unpaid`/`unfulfilled`.
- **`aPayment(overrides?)`** — valid `Payment` as `GET /payments` returns it; amount 50, status `succeeded`.
- **`aUser(overrides?)`** — valid `User`; id `1`, email `ada@example.com`.
- **`aReturn(overrides?)`** — valid `Return` with one line, status `approved`, no staff actions open.
- **`aProduct(overrides?)`** — valid catalogue `Product`; in-stock, active.
- **`aLevel(overrides?)`** — valid `InventoryLevel` stock-board row; 10 on hand, 2 reserved.
- **`aPreorderLevel(overrides?)`** — valid `PreorderLevel` allowance row; limit 10, 4 outstanding.
- **`aPreorderSummary(overrides?)`** — valid `PreorderProductSummary`; 3 paid, all waiting.
- **`aPreorderFulfillmentOrder(overrides?)`** — valid `PreorderFulfillmentOrder`; one waiting line, `awaiting_stock` hold.
- **`aFulfillmentOrder(overrides?)`** — valid `FulfillmentOrder` as `GET /delivery/order/{id}` returns it; one physical line, open, no actions.
- **`aShipment(overrides?)`** — valid `Shipment`; status `shipped`, one line, no actions.
- **`aShop(overrides?)`** — valid `Shop`; Italian seller, EUR, ships to IT.

All factories accept a single `Partial<T>` overrides argument (spread last) so callers specify only the fields their case exercises.

## Relationships

- **Consumed by cart specs** (`cart-view-double-submit`, `cart-view-interleavings`, `cart-view-stale-refusal`, `merge-report-alert`, `store-checkout-key`, `store-interleavings`, `store-stale-answer`, `store.spec`) — these import `anOrder`, `aPayment`, `aUser`, `aProduct`, `aReturn`, and related factories to build mock API responses.
- **Consumed by delivery specs** (`fulfillment-order-card`, `hold-dialog`, `preorder-fulfillment-table`, `ship-items-dialog`, `ship-lines`, `shipment-panel`, `shipment-row`) — these import `aFulfillmentOrder`, `aPreorderFulfillmentOrder`, `aShipment`, `aLevel`, `aPreorderLevel`, `aPreorderSummary`, `aShop`, and related factories for their delivery-domain fixtures.

## Notes

- Cross-referencing IDs are consistent by convention (`o1`, `fo1`, `p1`, `s1`, `r1`, `pay-1`, `u1`), so specs can assemble a coherent multi-entity scenario by mixing factories without manually aligning foreign keys.
- Defaults are deliberately "neutral" (zero totals, single line, no actions open) — a test that needs a populated order or an action-eligible shipment must override explicitly; there is no "rich" preset.
- Because the return type is the full contract type (not `any` or a loose interface), the TypeScript compiler enforces that every required field is present in the base object. If the contract gains a required field, every factory in this file fails to compile, forcing a single-point update.
