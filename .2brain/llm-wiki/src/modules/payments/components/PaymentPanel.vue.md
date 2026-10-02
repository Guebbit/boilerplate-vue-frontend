---
source: src/modules/payments/components/PaymentPanel.vue
sha256: 454faa8c38580c90f913c0b518068968f7cb1a57d87d4e988814713537edf5de
generated_at: 2026-10-02T15:27:44.915717+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentPanel.vue

## Purpose

Order-page payment panel that renders a method picker and submit form while an order is payable, or the payment's current state (in-flight, processing, succeeded, refund-pending) once a payment record exists. All payment lifecycle logic (intent, confirm, sync) is delegated to the payments Pinia store; the component handles presentation, error classification, anti-bot challenge, and emits `paid` so the parent can re-read the order.

## Key elements

- **`payment`** (computed) — guards the store's shared `payment` ref against a stale/mismatched `orderId` (FA24), returning `undefined` when they disagree.
- **`payable`** (computed) — form visibility: reads `payment.actions.pay` when a payment exists, otherwise falls back to the `orderPayable` prop.
- **`inFlight`** (computed) — true for `requires_action` or `processing`; the panel shows a "continue at provider" step instead of the form.
- **`refundPending`** (computed) — B1b: non-card `succeeded` payment on a `cancelled` order, indicating an operator refund is still outstanding.
- **`submitPayment()`** — calls `paymentsStore.payForOrder`; on success toasts + emits `paid`; on failure routes through `classifyPaymentError` (product-unavailable list, antibot challenge, or generic blocking error).
- **`finishAtProvider()`** — calls `paymentsStore.finishAtProvider` to resolve an in-flight/processing payment.
- **`announceIfSettled()`** — shared success path: `addMessage` toast + `emit('paid')`.
- **`unavailableLines`** (ref) — holds `UnavailableOrderLine[]` when the server rejects with `ORDER_PRODUCT_UNAVAILABLE`.
- **`useBlockingError`** destructure — single blocking-error state shared by both the pay and finish steps.
- **`humanCheck` / `requiresHumanCheck`** — conditionally mounts the `HumanCheck` widget when the server signals a rung-3 anti-bot challenge; its token is forwarded via `withAntibotToken` on the next attempt.
- **`watch(orderId, …, { immediate: true })`** — fetches the payment on mount and on `orderId` change without a component remount.

## Relationships

- **`src/modules/payments/store.ts`** — imported as `usePaymentsStore`; source of all payment state (`payment`, `loading`) and lifecycle actions (`fetchPaymentForOrder`, `payForOrder`, `finishAtProvider`). This is the component's sole data/action dependency.
- **`src/modules/payments/index.ts`** — listed as a graph neighbor (likely re-exports this component or the store); no direct import visible in the truncated content.
- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor; no direct import visible in the truncated content.

## Notes

- The component intentionally contains **no card-number field**. A real provider tokenises inside its own iframe; this panel's method picker is a demo stand-in that produces the same kind of opaque reference.
- The panel is **reused across orders** without remount (per `Order.vue`'s `watchOrder`), which is why the `payment` computed guard and the `orderId` watcher exist.
- `refundPending` depends on the `orderStatus` prop; it only fires for non-card methods because card refunds are automatic, whereas manual (bank-transfer) refunds require operator confirmation.
- The `payBy` deadline prop is shown generically for **all** payable orders (FA32c), not just bank-transfer; `TransferInstructionsPanel` adds its own transfer-specific wording on top.
- `classifyPaymentError` is imported from `@/modules/payments/domain`, keeping the component free of error-code string matching.
