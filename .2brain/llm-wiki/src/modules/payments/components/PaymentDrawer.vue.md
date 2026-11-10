---
source: src/modules/payments/components/PaymentDrawer.vue
sha256: 5713e706e4c460a6a78bf6fbaac4464b12752d2aa8d287798a0d902544936e88
signature: 5713e706e4c460a6a78bf6fbaac4464b12752d2aa8d287798a0d902544936e88
generated_at: 2026-11-10T05:08:27.555440+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentDrawer.vue

## Purpose

A temporary Vuetify side-drawer that surfaces the detail a list row cannot fit—refunds with their provider references, card digits, failure reasons—and renders the action buttons the server has authorised via the payment's `actions` object (refund, mark-returned, cancel-refund). It is a pure renderer of permissions: it never decides *who* may act, only *whether* to show a button.

## Key elements

- **`handleRefund`** — `singleFlight`-wrapped handler; shows a confirm dialog, then calls `store.refundPayment`. On success, dispatches a toast (built by `refundNotice`), emits `changed`, and closes the drawer *unless* the refund was refused (failed refunds stay open so "Mark returned" is visible).
- **`handleMarkReturned`** — `singleFlight`-wrapped; confirms and calls `store.settleRefundByHand` for a hand-paid refund waiting on the operator. No network mail is sent; the operator's click is the record.
- **`handleCancelRefund`** — `singleFlight`-wrapped; no confirm dialog (the note field in `RefundCancelForm` is the deliberate step). Calls `store.cancelRefund` with the staff note.
- **`canRefund` / `canSettle(refundId)` / `canCancel(refundId)`** — Read `payment.actions.refund`, `.settleByHand`, and `.cancelRefund` to gate visibility of each button per refund.
- **`useBlockingError`** (`refundError` / `reportRefundError` / `clearRefundError`)** — Renders refund/settle/cancel failures as an inline alert in the drawer rather than a transient toast, since the confirm dialog is already gone.
- **`cancelling`** — Ref tracking which refund's `RefundCancelForm` is open; only one at a time.
- **`orderEditLink`** — Computed; resolves a `routerLinkI18n` to the `OrderEdit` route if the orders module is shipped, otherwise `undefined`.
- **`drawerWidth`** — `Math.min(440, screenWidth)` to prevent the drawer from overflowing a narrow viewport.
- **`useReturnFocus`** — Returns focus to the row that opened the drawer on close (WAI-ARIA APG dialog pattern).
- **`singleFlight`** wrapper — Prevents a second invocation while the confirm dialog or the in-flight request is still active.

## Relationships

- **`store.ts`** (`usePaymentsStore`) — Provides `refundPayment`, `settleRefundByHand`, and `cancelRefund`; the sole API surface the drawer calls for mutations.
- **`refund-notice.ts`** (`refundNotice`) — Builds the toast text and severity after a successful refund, taking into account whether the refund was refused and whether `settleByHand` is available.
- **`PaymentStatusChip.vue`** — Rendered in the drawer header next to the amount to show the payment's `displayStatus`.
- **`DisputeBanner.vue`** — Imported for display when the payment has an active dispute.
- **`RefundCancelForm.vue`** — Renders the note-input form for the cancel-refund action; emits the validated note back to `handleCancelRefund`.
- **`PaymentsList.vue`** — Parent view; owns the `payment` prop and the `open` model, and listens for the `changed` emit to reload the list row.
- **`payment-drawer.spec.ts`** — Unit / component tests for this drawer.

## Notes

- The component `name` is declared in a separate `<script>` block because `<script setup>` cannot set `name` itself; it is required for devtools and `<KeepAlive>`.
- A **failed** refund (status `'failed'`) keeps the drawer open so the operator can immediately use "Mark returned"; a successful refund closes it.
- All three mutation handlers share the same `refunding` ref and the same `useBlockingError` instance—only one mutation can be in flight at a time, and errors from any of the three render in the same inline slot.
- `canSettle` and `canCancel` are plain functions (not computed) because they take a per-refund `refundId` argument; they read from the reactive `props.payment.actions` arrays.
- The drawer is `temporary` and located at `end` (right side); it has no activator element, hence the manual `useReturnFocus` rather than Vuetify's built-in focus management.
