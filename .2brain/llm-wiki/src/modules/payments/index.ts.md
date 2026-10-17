---
source: src/modules/payments/index.ts
sha256: 884b47f66768964e76a71f13260f1086132d7d780ee7d9a079e11388260f58af
generated_at: 2026-10-17T01:23:21.921696+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/index.ts

## Purpose

Public barrel for the payments module. It is the single entry point through which other parts of the app access payments-related components and the one composable (`useOrderRefund`) that is intentionally exposed across module boundaries. The store and `useRecordOfflinePayment` are deliberately kept internal.

## Key elements

- **`PaymentPanel`** — the main payment panel mounted on the order page.
- **`PaymentMethodSelector`** — the payment-method choice widget mounted by the cart's checkout flow.
- **`RecordOfflinePaymentForm`** — the offline-payment recording form mounted on the operator's order-edit page.
- **`OrderReferenceSearch`** — the RF-reference lookup widget mounted on the orders list page.
- **`useOrderRefund`** (composable) — the sole non-component export; answers one question and performs one action (refund), called directly by the `orders` edit page.

## Relationships

- **Re-exports** all four Vue components from `./components/` and `useOrderRefund` from `./composables/`. External modules consume the payments module exclusively through this barrel.
- **`OrderReferenceSearch.vue`** and **`PaymentMethodSelector.vue`** are self-contained: they read the payments store internally, so callers never touch the store.
- **`RecordOfflinePaymentForm.vue`** uses `useRecordOfflinePayment` internally; that composable is *not* re-exported here, keeping it private to this module.
- **`use-order-refund.ts`** is the one element that crosses the barrel boundary. The `orders` module's edit page imports it directly from this file rather than mounting a wrapper component, which is why it is published here while its sibling is not.

## Notes

- The store and `useRecordOfflinePayment` are intentionally **not** exported. Adding them to this barrel would break the module's encapsulation contract: the only safe external surface is the four components plus `useOrderRefund`.
- `useOrderRefund` is treated as a deliberate, narrow exception (single question + single action) rather than a general composable escape hatch. New cross-module needs should be exposed as components, not composables, to keep store reads on this side of the barrel.
