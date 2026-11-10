---
source: src/modules/payments/tests/payment-panel.spec.ts
sha256: 0e118bd82f7acd9b16a6dfd35a7707e8c567cfb0376553341b61dbbef17664b9
signature: 2bfe357aa9d0802b36ba8f0508588ad90622b4f975c9e4be441c5804ae1394ef
generated_at: 2026-11-10T05:15:19.177818+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/payment-panel.spec.ts

## Purpose

Vitest spec that mounts the real `PaymentPanel` component and asserts what it renders for a given store state. Scoped to panel-level rendering only — the PSP sequence is covered at the store level elsewhere. Follows the same spy-on-the-store-write pattern as `record-offline-payment-form.spec.ts`.

## Key elements

- **`mountPanel(props, offered)`** – Helper that activates a fresh Pinia, sets `store.methods`, spies `fetchPaymentForOrder` and `fetchMethods`, then mounts `PaymentPanel` with Vuetify + i18n. Defaults: `orderId: 'order-1'`, `orderPayable: true`, offered methods `[{ id: 'card' }]`. Returns `{ store, wrapper }`.
- **`handPaidSucceededPayment`** – Static fixture (via `aPayment`): a settled, `manual`/`bank_transfer` payment of 100.00.
- **`pendingRefund`** – A single refund record (status `pending`, 100.00 EUR) attached to the fixture.
- **`waitingRefund()`** – Factory that merges the above into a payment with `displayStatus: 'refund_pending'`.
- **Test suites** – Covers: card-availability gating, payment-deadline (`payBy`) visibility, hand-paid refund pending vs. confirmed vs. failed-card-refund vs. `owedAnotherWay`, the "paid-by" offline detail line, and order-ID re-fetch / stale-record guard.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/payments/components/PaymentPanel.vue` | The component under test; mounted directly via `@vue/test-utils`. |
| `src/modules/payments/store.ts` | `usePaymentsStore` is used to drive state; `methods` and `fetchPaymentForOrder` / `fetchMethods` are spied and asserted. |
| `tests/support/unit/fixtures.ts` | Provides `aPayment`, used to build the `handPaidSucceededPayment` object. |
| `tests/support/unit/mounted-vm.ts` | `nextRenderTick` awaits one Vue render tick after mutating store state before asserting DOM. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore` is called once at module top level to register i18n / other globals before any test runs. |

## Notes

- **Lazy-chunk test timeout:** The "test cards in a development build" test uses `vi.waitFor` with a 15 s inner timeout and a 20 s outer `it` timeout because the picker is a lazy chunk whose SFC compilation can exceed Vitest's default 1 s under CPU load. This is a real bound, not a sleep.
- **Shared store instance across orders:** `OrderTarget.vue` reuses the same panel instance when the route param changes (no remount). The spec explicitly verifies that a stale payment record from the previous order is hidden *before* the new fetch resolves, and that `fetchPaymentForOrder` is called with the new id.
- **`card` availability is deployment-dependent:** A deployment with no card provider (today's production) must render a "card unavailable" message and must *not* render the submit button or method select.
- **`displayStatus` is always server-authoritative:** The spec never derives refund state from the order's own status; it reads the `displayStatus` and `refunds[]` array the server provides.
- **`wireModulesIntoCore()` is module-level, not in `beforeEach`:** It runs once before the first test, so its effects are not re-applied per test.
