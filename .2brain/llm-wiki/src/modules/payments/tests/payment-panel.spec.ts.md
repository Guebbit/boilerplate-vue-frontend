---
source: src/modules/payments/tests/payment-panel.spec.ts
sha256: 6e89b536170ad41e1ed1976bed84f5f795171b548cafe5844b0caf4195120a97
generated_at: 2026-10-17T01:25:00.138157+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payment-panel.spec.ts

## Purpose

Vitest spec for the `PaymentPanel` Vue component. Verifies what the panel renders (or hides) based on deployment capabilities, order payability, payment status, and order transitions. Scoped to panel-level rendering only — the PSP sequence is covered at the store level elsewhere.

## Key elements

- **`mountPanel(props, offered)`** — helper that creates a fresh Pinia store, spies on `fetchPaymentForOrder` and `fetchMethods`, sets `store.methods`, and mounts `PaymentPanel` with Vuetify + i18n. Returns `{ store, wrapper }`.
- **`handPaidSucceededPayment`** — a `Payment` fixture (provider `manual`, method `bank_transfer`, status `succeeded`) used across B1b and partial-refund tests.
- **`describe('PaymentPanel')`** — main block covering:
  - Card form visibility tied to deployment `offered` methods.
  - Payment deadline (`payBy`) rendering.
  - B1b: refund-pending / refunded-by-hand labels for hand-paid payments on cancelled orders.
  - Re-fetch and stale-record guard when `orderId` changes without a remount.
- **`describe('a partially refunded payment')`** — asserts the partial-refund amount display and its absence at 0 or full refund.
- **`describe('the status chip')`** — parameterized check that the chip reads `displayStatus`, not the raw `status`.
- **`describe('PaymentPanel — a waiting bank transfer')`** — verifies transfer-instructions rendering and that the card form remains when the order is still payable.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** — the component under test; mounted directly via `mount()`.
- **`src/modules/payments/store.ts`** — provides `usePaymentsStore`; its methods are spied/mocked and its `payment` ref is set imperatively to drive render assertions.
- **`tests/support/unit/mounted-vm.ts`** — supplies `nextRenderTick`, used to await reactive DOM updates after mutating store state.
- **`tests/support/unit/wire-modules.ts`** — supplies `wireModulesIntoCore`, called once at module top-level to register test doubles before any test runs.

## Notes

- Follows the same "spy on the store's own write" pattern as `record-offline-payment-form.spec.ts`.
- `wireModulesIntoCore()` runs at module scope, not in `beforeEach` — it must execute before the first `mount`.
- The payment-method picker is a lazy chunk; tests that assert its presence use `vi.waitFor` rather than a single tick.
- The store's `payment` ref is shared across orders (Order.vue reuses the panel instance without remounting on route-param change), which is why the orderId-re-fetch block exists.
- `loadLocale('en')` is awaited in `beforeEach` so i18n strings are available for text assertions.
