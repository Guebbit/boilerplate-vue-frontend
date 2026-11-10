---
source: src/modules/payments/components/PaymentPanel.vue
sha256: 84a18dd9a8d6d81ad7b36f05ebbc718d4fe5a9029a51d089937b426d471462a9
signature: 84a18dd9a8d6d81ad7b36f05ebbc718d4fe5a9029a51d089937b426d471462a9
generated_at: 2026-11-10T05:08:56.862404+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentPanel.vue

## Purpose

The order-page payment panel. While the order is payable it renders the payment form (card widget or test-card picker); once a payment record exists it renders the payment's current fate (in-flight, refund-pending, settled). All intent/confirm/sync HTTP calls are delegated to the payments store — this component only orchestrates UI state, error surfacing, and the parent's `paid` event.

## Key elements

- **`payment` (computed)** — Guards the store's shared `payment` ref against stale cross-order data; returns `undefined` if `rawPayment.orderId !== orderId`.
- **`cardOffered` (computed)** — True only when the deployment's method list includes `card`; gates the card form.
- **`HAS_TEST_CARDS` (const)** — Build-time flag (`import.meta.env.DEV || VITE_TEST_CARDS`). When false, the `TestCardPicker` dynamic import is proven dead and excluded from the production bundle.
- **`TestCardPicker` (async component | undefined)** — Lazily loaded only in dev/e2e builds; stands in for a live provider's tokenising iframe.
- **`payable` (computed)** — Prefers `payment.actions.pay` once a record exists; falls back to the `orderPayable` prop before any intent.
- **`inFlight` (computed)** — True for `requires_action` / `processing` statuses without a `nextAction`; shows the "finish at provider" step instead of the form.
- **`refundPending` / `cardRefundPending` / `owedAnotherWay` (computed)** — Distinguish manual-refund-pending, card-refund-pending, and "owed another way" (negotiated) refund states for display.
- **`submitPayment`** — Calls `paymentsStore.payForOrder` with the chosen method ref and an optional anti-bot token; on `ANTIBOT_VERIFICATION_FAILED` reveals the inline `HumanCheck` widget instead of a generic error.
- **`finishAtProvider`** — Calls `paymentsStore.finishAtProvider` to re-check a challenge or processing payment; used as the "I'm done" button when the panel is in-flight.
- **`announceIfSettled`** — If status is `succeeded`, fires a success toast and emits `paid`.
- **`useBlockingError`** — Single shared blocked-state instance for both the submit and finish-at-provider steps (never shown simultaneously).
- **`watch(orderId, …, { immediate: true })`** — Fetches the payment on mount and on every order change without a remount.
- **`onMounted`** — Fetches available methods if the store hasn't loaded them yet.

## Relationships

- **`src/modules/payments/store.ts`** — Primary data source: `usePaymentsStore` supplies `payment`, `loading`, `methods` (via `storeToRefs`) and the actions `payForOrder`, `finishAtProvider`, `fetchMethods`, `fetchPaymentForOrder`.
- **`PaymentStatusChip.vue`** — Rendered in the template to display the payment's status when a record exists.
- **`TestCardPicker.vue`** — Conditionally imported (dev/e2e only); its selected value is written into `paymentMethodRef` before `submitPayment` reads it.
- **`TransferInstructionsPanel.vue`** — Rendered alongside the generic `payBy` deadline text when the payment method is bank transfer.
- **`src/modules/payments/index.ts`** — Module barrel; re-exports this component for external consumers.
- **`src/modules/payments/tests/payment-panel.spec.ts`** — Unit/integration tests exercising this component's rendering and store interactions.

## Notes

- **No card number ever reaches this component.** A live provider tokenises the card inside its own iframe; the app only holds an opaque method reference. This is what keeps the deployment in the lighter PCI-DSS scope.
- **Shared store ref hazard.** The store's `payment` is a single ref reused across all orders. The `payment` computed is the sole guard preventing a late response for order A from rendering under order B.
- **No remount on order change.** The parent (`OrderTarget.vue`) reuses the same panel instance across route-param changes; the `watch` with `immediate: true` is what keeps data in sync.
- **Dual `<script>` blocks.** The plain `<script>` exists solely to declare `name: 'PaymentPanel'` for devtools/`<KeepAlive>`, since `<script setup>` cannot set it.
- **`payBy` is generic.** It is shown for any payable order (card included), not only bank-transfer orders. `TransferInstructionsPanel` adds transfer-specific wording on top.
- **Anti-bot gate is progressive.** `HumanCheck` mounts only after a prior decline on the same order; the first attempt never sees it.
