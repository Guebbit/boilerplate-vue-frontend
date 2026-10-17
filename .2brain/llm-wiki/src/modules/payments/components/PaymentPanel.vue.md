---
source: src/modules/payments/components/PaymentPanel.vue
sha256: 122be224fd7c90e850166b80f0afaff7cbb2cd349819d2678bccfac45f815896
generated_at: 2026-10-17T01:21:49.198311+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentPanel.vue

## Purpose

The order-page payment panel: renders the card-payment form while the order is still payable, shows the payment's current state (in-flight, succeeded, refund-pending) afterwards, and delegates the intent → confirm → sync sequence to the payments Pinia store. It also surfaces the antibot human-challenge flow and the generic stock-hold deadline.

## Key elements

- **Props** — `orderId`, `orderPayable`, `orderStatus`, `payBy`; drive the panel's visibility, deadline display, and B1b refund-pending detection.
- **`payment` (computed)** — Guards the store's shared `payment` ref by matching `orderId`; discards stale records from a previous order's in-flight fetch.
- **`payable` (computed)** — True while the payment's own `actions.pay` (or, before any intent, the order's `actions.pay`) is `true`; gates the card form.
- **`inFlight` / `refundPending` (computed)** — Distinguish "bank challenge in progress" from "succeeded but cancelled, awaiting operator refund (B1b)."
- **`submitPayment()`** — Calls `paymentsStore.payForOrder` with the chosen method ref and antibot token; on `ANTIBOT_VERIFICATION_FAILED` flips `requiresHumanCheck` to mount the `HumanCheck` widget inline.
- **`finishAtProvider()`** — Reports the browser's return from the provider (challenge answered or re-check) via `paymentsStore.finishAtProvider`.
- **`announceIfSettled()`** — Toasts success and emits `'paid'` so the parent reloads the order.
- **`TestCardPicker` (lazy)** — `defineAsyncComponent` behind a build-time `HAS_TEST_CARDS` flag; dead-code-eliminated from production bundles.
- **`watch(orderId)`** — Re-fetches the payment on route-param change without a remount (immediate: true covers initial mount).
- **`onMounted`** — Fires `fetchMethods()` if the methods list is still empty.

## Relationships

- **`../store.ts`** — Primary data source: reads `payment`, `methods`, `loading` via `storeToRefs`; calls `payForOrder`, `finishAtProvider`, `fetchMethods`, `fetchPaymentForOrder`.
- **`./PaymentStatusChip.vue`** — Rendered in the template to display the payment's lifecycle state.
- **`./TestCardPicker.vue`** — Conditionally imported; only present in dev/e2e builds, supplies `paymentMethodRef`.
- **`./TransferInstructionsPanel.vue`** — Shown when `payment.nextAction` exists (bank-transfer instructions) alongside the card form.
- **`src/modules/payments/index.ts`** — Module barrel that re-exports this component for external consumers.
- **`src/modules/payments/tests/payment-panel.spec.ts`** — Unit/integration tests covering the prop-driven state matrix and submit flow.

## Notes

- **No card fields by design.** The live provider's widget (or the test picker in dev) mounts where the form body is; a card number never reaches this component or its API, keeping the app in the lighter PCI scope.
- **Stale-payment guard is load-bearing.** The store's `payment` is a single shared ref; the `orderId` match in the computed is the only thing preventing a previous order's payment from rendering on the current one.
- **`HAS_TEST_CARDS` is build-time constant.** `import.meta.env.DEV` or `VITE_TEST_CARDS === 'true'` is evaluated at compile time, so the dynamic import branch is eliminated in production — `pm_card_*` strings never ship.
- **`orderStatus` prop is optional and only read for B1b.** The panel does not drive order status; it only checks `OrderStatus.cancelled` to explain why a succeeded manual payment shows as "refund pending."
- **`HumanCheck` ref is typed with an eslint-disable.** TypeScript-ESLint cannot fully resolve the SFC instance type through `InstanceType<typeof HumanCheck>`; the `token` property is exposed via that component's `defineExpose`.
