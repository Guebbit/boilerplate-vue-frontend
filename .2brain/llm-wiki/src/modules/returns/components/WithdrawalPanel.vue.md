---
source: src/modules/returns/components/WithdrawalPanel.vue
sha256: ef4061df625f35bb9a7ba791198a39d55543959072f7a4accc3ed34d0e04494b
generated_at: 2026-10-17T01:37:21.543764+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/WithdrawalPanel.vue

## Purpose

The "returns corner" of the order detail page. It surfaces the EU consumer-rights withdrawal button (Art. 11a), the list of still-cancellable fulfillment orders, the returnable lines, and the history of returns/withdrawals already opened — all driven by server-provided data from `GET /returns/options`. It deliberately counts nothing and never reads the withdrawal period itself; visibility and availability are entirely server-gated.

## Key elements

- **`WithdrawalPanel`** (named component) — the SFC export; name enables `<KeepAlive>` and devtools identification alongside `<script setup>`.
- **Props** — `orderId`, `canWithdraw` (server's `Order.actions.withdraw` flag), `withdrawUntil` (ISO timestamp or omitted).
- **Emits** — `opened`: fires after a withdrawal, a return, or a cancellation so the parent page can re-fetch the order.
- **`cancelMode`** (computed) — resolves to `'buyer'` | `'staff'` | `undefined` based on `canWithdraw` or the session's `create:Refund` permission.
- **`cancellable`** (computed) — filters `options.cancellable` to entries where the server set `cancel === true` for *this* caller.
- **`returnLines`** (computed) — passthrough of `options.returnable` to `ReturnRequestForm`.
- **`loadOpened`** — parallel fetch of `fetchOrderReturns` and `fetchReturnOptions`; failures leave state empty rather than blocking the UI.
- **`handleWithdraw`** — confirmation dialog → `openReturn({ reason: 'withdrawal' })` → toast + `emit('opened')` + reload. Refusals are surfaced in-place via `useBlockingError`.
- **`handleReturnOpened` / `handleCancelled`** — both emit `opened` and call `loadOpened`.
- **`cancelOpen`** — writable computed bridging the `v-model` of `CancelRemainderDialog` to the `cancelling` ref.
- **Template gate** — the entire `<section>` renders only when at least one of the four data sources is non-empty.

## Relationships

- **`src/modules/returns/store.ts`** — primary data source; provides `openReturn`, `fetchOrderReturns`, `fetchReturnOptions`, and the shared `loading` flag that disables all action buttons during in-flight requests.
- **`src/modules/returns/components/CancelRemainderDialog.vue`** — child dialog opened per cancellation; receives the specific `CancellableFulfillmentOrder`, the `cancelMode`, and emits `cancelled` back to this component.
- **`src/modules/returns/components/ReturnRequestForm.vue`** — child form for submitting a return of received goods; receives `order-id` and `lines`, emits `opened` back to this component.
- **`src/modules/returns/tests/withdrawal-panel.spec.ts`** — unit-test suite exercising this component's rendering, gate conditions, and event flow.

## Notes

- The withdrawal button requires a **confirmation step** (dialog) before acting — this is a legal requirement of the Consumer Rights Directive, not a UI preference. Do not remove the dialog.
- `cancelMode` is `undefined` (not `null` or `'none'`) when the caller has neither the buyer flag nor the `create:Refund` permission; all downstream conditionals must treat `undefined` as "no door."
- The `cancellable` filter checks the per-item `cancel` flag *in addition to* the mode check — a staff member with the refund key still cannot cancel items the server marked non-cancellable.
- `loadOpened` swallows fetch errors silently (`.catch(() => [])` / `.catch(() => undefined)`); the UI degrades to "nothing to show" rather than surfacing an error, because a 403 on the options endpoint is an expected permission boundary.
- The component does **not** import or use `src/infrastructure/utils/logger.ts` or `src/modules/returns/index.ts` directly; those graph edges are transitive (via the store or barrel re-exports).
