---
source: src/modules/payments/index.ts
sha256: 8eb877c05992fd6d25eeb1599859320e5417bc5b4ff46593fb2c63dd65f4a9f1
generated_at: 2026-10-02T15:29:29.331356+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/index.ts

## Purpose

Public barrel for the payments module. It re-exports the five UI components that sibling pages mount (order page, cart checkout, operator order-edit, orders list) plus one composable (`useOrderRefund`) that the orders module calls directly. The internal store and `useRecordOfflinePayment` are deliberately kept private to this module.

## Key elements

- **`PaymentPanel`** — the main payment panel mounted on the order page.
- **`TransferInstructionsPanel`** — the transfer-instructions card also mounted on the order page.
- **`PaymentMethodSelector`** — payment-method choice widget mounted by the cart's checkout.
- **`RecordOfflinePaymentForm`** — offline-payment recording form mounted on the operator's order-edit page.
- **`OrderReferenceSearch`** — RF-reference lookup widget mounted in the orders list.
- **`useOrderRefund`** (from `./composables/use-order-refund`) — the single composable that crosses the module boundary; called directly by the `orders` edit page to perform a refund.

## Relationships

- Re-exports each of the five Vue components from `./components/` (their sole import source for external consumers).
- Re-exports `useOrderRefund` from `./composables/use-order-refund.ts`, making it the only non-component symbol available to other modules (specifically `orders`).
- Does **not** export the module's internal store or `useRecordOfflinePayment`; those remain reachable only from within `./components/`.

## Notes

- `useOrderRefund` is published as a deliberate exception: the `orders` edit page needs it, and it performs exactly one action, so exposing it does not grant broader store access.
- `OrderReferenceSearch` crosses the boundary *as a component* rather than as a composable, so its internal store reads stay on the payments side.
- If you need to read payment state from another module, you must go through one of the exported components or `useOrderRefund` — there is no direct store export to import.
