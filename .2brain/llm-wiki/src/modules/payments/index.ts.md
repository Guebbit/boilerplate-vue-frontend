---
source: src/modules/payments/index.ts
sha256: 00a3d061dd3d54d4092afbaa5acb37210b472d8b5bcfb87ef602630bb6efc7d5
signature: 00a3d061dd3d54d4092afbaa5acb37210b472d8b5bcfb87ef602630bb6efc7d5
generated_at: 2026-11-10T05:12:08.286724+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/index.ts

## Purpose

Public barrel for the payments module. It defines the module's external API by re-exporting six UI elements (five Vue components and one composable) that other modules mount or call. The module's internal store and the `useRecordOfflinePayment` helper are deliberately kept private.

## Key elements

- **`PaymentPanel`** — the main payment panel mounted on the order page.
- **`PaymentMethodSelector`** — the payment-method choice widget mounted on the cart's checkout.
- **`RecordOfflinePaymentForm`** — the form the operator's order-edit page uses to record an offline payment (consumes the internal `useRecordOfflinePayment` helper).
- **`OrderReferenceSearch`** — the RF-reference lookup mounted on the orders list; its store reads stay on the module side.
- **`OrderDisputes`** — the dispute banner shown above the offline-payment form on the order-edit page.
- **`useOrderRefund`** — composable exported as the sole non-component exception; called directly by the `orders` module's edit page to answer one question and perform one refund action.

## Relationships

This file is the only bridge between the `payments` module and external callers. Each graph neighbor is reached exclusively through a re-export here:

- `src/modules/payments/components/PaymentPanel.vue`, `src/modules/payments/components/PaymentMethodSelector.vue`, `src/modules/payments/components/RecordOfflinePaymentForm.vue`, `src/modules/payments/components/OrderReferenceSearch.vue`, `src/modules/payments/components/OrderDisputes.vue` — re-exported as named/default component bindings for other modules to import.
- `src/modules/payments/composables/use-order-refund.ts` — re-exported as a named composable; the only internal helper that crosses the barrel because the `orders` module invokes it directly.

The module's internal store and `useRecordOfflinePayment` have **no** export here; sibling modules never see them.

## Notes

- **Barrel asymmetry by design.** `useOrderRefund` is exported while `useRecordOfflinePayment` is not. The rationale (documented in the file header) is that `useOrderRefund` answers a single question / performs a single action, so publishing it does not reopen the store. `useRecordOfflinePayment` is single-consumer (the form in the same module), so there is no sibling to publish it to.
- **Components, not composables, carry internal state outward.** `OrderReferenceSearch` needs store data but crosses as a component, keeping reads on the module side rather than exporting a composable.
- Import path for external consumers is this file's directory (`src/modules/payments`), not the individual component/composable paths.
