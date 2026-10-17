---
source: src/modules/payments/components/PaymentDrawer.vue
sha256: 5072d9e26446b60c11b5197a41d2689340a6726eb3bdf3aae968f2734fb030cd
generated_at: 2026-10-17T01:21:24.474313+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentDrawer.vue

## Purpose

A right-side navigation drawer that expands on a single payment row selected in the payments list. It surfaces details that don't fit in a table cell — provider references, card last-4, individual refund entries with failure reasons — and exposes the **Refund** action (gated by `payment.actions.refund`) and a conditional link to the order-edit page.

## Key elements

- **`open` (defineModel, `boolean`)** — v-model binding controlling drawer visibility; defaults to `false`.
- **`payment` (prop, `Payment | undefined`)** — the payment to display; `undefined` while nothing is selected.
- **`handleRefund()`** — shows a destructive confirm dialog, calls `store.refundForOrder(orderId)`, fires a success toast, emits `'changed'`, and closes the drawer. On failure the error is captured via `useBlockingError` and rendered inline. A `refunding` ref blocks double-clicks.
- **`orderEditLink` (computed)** — resolves a `routerLinkI18n` target to the `OrderEdit` route only when that route exists in the current build (checked via `linkIfRouted`); returns `undefined` otherwise.
- **`refundError` / `reportRefundError` / `clearRefundError`** — from `useBlockingError`; drives the inline `InlineErrorAlert` so a failed refund stays visible in the drawer rather than fading as a toast.
- **`PaymentStatusChip`** — renders the payment's `displayStatus` next to the amount in the header.
- **`emit('changed')`** — signals the parent list that money moved so it can refetch.

## Relationships

- **`src/modules/payments/store.ts`** — imports `usePaymentsStore`; calls `store.refundForOrder(orderId)` to execute the refund.
- **`src/modules/payments/components/PaymentStatusChip.vue`** — imported and rendered in the drawer header to show the payment's current status.
- **`src/modules/payments/views/PaymentsList.vue`** — parent view that binds `open` / `payment` and listens for the `'changed'` event to reload the list.
- **`src/modules/payments/tests/payment-drawer.spec.ts`** — unit-test spec that exercises this component's rendering and refund flow.

## Notes

- The dual `<script>` blocks are intentional: the first declares `name: 'PaymentDrawer'` so `<KeepAlive>` and devtools can identify the component, since `<script setup>` cannot set a name.
- The refund confirm dialog and the request are sequential: the dialog closes *before* the HTTP call resolves, which is why the error state lives in the drawer (via `useBlockingError`) instead of a transient toast.
- `orderEditLink` is entirely optional at runtime; if the `orders` module is not bundled, the "Open order" button simply doesn't render.
- All user-facing strings go through `t()` (vue-i18n); the i18n key namespace is `payments-list-page.*`.
- The drawer is marked `temporary` + `location="end"` (right side) with a fixed 440 px width; ESC key closes it via `@keydown.esc`.
