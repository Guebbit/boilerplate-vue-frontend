---
source: src/modules/payments/tests/payment-panel.spec.ts
sha256: caa00be2d72fc6b766a7f5aa1203233697d743dc6a8fb87ca3cf35e82afbb0e5
generated_at: 2026-10-02T15:30:44.924085+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payment-panel.spec.ts

## Purpose

Unit tests for the `PaymentPanel.vue` component, verifying its UI behavior around payment deadlines, product-unavailable refusals, hand-paid refund states, cross-order state hygiene, and partial refunds. The file mounts the real component with a mocked store (spying `fetchPaymentForOrder` and `payForOrder`) rather than testing store logic, which is covered elsewhere.

## Key elements

- **`mountPanel`** — local helper that creates a fresh Pinia instance, spies `fetchPaymentForOrder` to resolve `undefined`, then mounts `PaymentPanel` with default props (`orderId: 'order-1'`, `orderPayable: true`) plus any caller-supplied overrides. Returns `{ store, wrapper }`.
- **`handPaidSucceededPayment`** — a `Payment` fixture (status `succeeded`, provider `manual`, method `bank_transfer`, amount 100 EUR) used across the refund-pending and partial-refund tests.
- **`describe('PaymentPanel')`** — top-level block containing all component-behavior tests:
  - *Form visibility* while the order is payable.
  - **FA32c – payment deadline** — `payBy` prop renders a deadline element only when the order is still payable.
  - *ORDER_PRODUCT_UNAVAILABLE refusal* — component renders named unavailable product lines, keeps the submit form open, and clears the banner when the next failure is a different error code.
  - **B1b – hand-paid payment on a cancelled order** — shows a "refund pending" label for manual/bank-transfer payments on cancelled orders; hides it once operator-confirmed refunded, for card payments, or while the order is still active.
  - **FA24 – cross-order state** — re-fetches when `orderId` changes without remount; hides a stale payment record immediately after the prop change, before the new fetch resolves.
- **`describe('a partially refunded payment')`** — separate top-level block asserting the partial-refund amount is displayed and the element is absent for zero or full refunds.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — calls `wireModulesIntoCore()` at module load so that the component's internal module references resolve under the test runner.
- **`tests/support/unit/mounted-vm.ts`** — imports `nextRenderTick`, a Promise that awaits Vue's render cycle, used after every state mutation or form submission before asserting on the DOM.
- **`@/modules/payments/components/PaymentPanel.vue`** — the component under test; mounted via `@vue/test-utils`.
- **`@/modules/payments/store.ts`** — the Pinia store (`usePaymentsStore`) whose methods are spied and whose `payment` ref is mutated directly to simulate server responses.

## Notes

- Tests that involve async store updates (e.g. setting `store.payment` then asserting DOM) use `nextRenderTick` instead of a fixed delay; some paths need two consecutive ticks.
- The `ORDER_PRODUCT_UNAVAILABLE` test uses `mockRejectedValue` (always), while the stale-banner test uses `mockRejectedValueOnce` twice to simulate two different failures in sequence.
- The FA24 "stale record" test relies on the fact that `fetchPaymentForOrder` is mocked to resolve `undefined` (i.e. it never writes to `store.payment`), so the old record persists as a stand-in for a slow response.
- The `beforeEach` calls `loadLocale('en')` after creating a fresh Pinia; the `i18n` plugin is registered on mount.
- Test IDs use `data-test` attributes (e.g. `payment-deadline`, `payment-unavailable-line`, `payment-refund-pending`) rather than CSS classes, so the assertions are decoupled from styling.
