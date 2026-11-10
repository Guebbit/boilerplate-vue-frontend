---
source: src/modules/returns/components/WithdrawalPanel.vue
sha256: fe54abee893f1b36be4ca7921c2285acb0f6e72a5f8dae61f1d3f9f29714ba31
signature: fe54abee893f1b36be4ca7921c2285acb0f6e72a5f8dae61f1d3f9f29714ba31
generated_at: 2026-11-10T05:37:26.418660+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/WithdrawalPanel.vue

## Purpose

The "returns corner" of the order page. It renders the EU Consumer Rights Directive Art. 11a withdrawal-from-contract button (buyer-only, with a mandatory confirmation step and no reason field), plus the server-driven options to cancel an unshipped fulfillment or return shipped goods. It never computes quantities or deadlines locally — every affordance is gated by `GET /returns/options` or the order's `actions` fields.

## Key elements

- **`WithdrawalPanel`** (named component) — the SFC itself; named for devtools / `<KeepAlive>`.
- **Props** — `orderId` (required), `canWithdraw`, `withdrawBlocked`, `withdrawUntil`, `orderNumber` (all optional; sourced from the parent order).
- **`emit('opened')`** — fired after any withdrawal, return, or cancellation succeeds so the parent page re-fetches the order.
- **`cancelMode`** (computed) — resolves to `'buyer'`, `'staff'`, or `undefined` based on `canWithdraw` and the `create:Refund` permission.
- **`staffMode`** (computed) — true when the caller is not the buyer but holds `update:Return`; enables the "record withdrawal" and return paths.
- **`cancelable`** (computed) — the subset of `options.cancelable` whose `cancel` flag is `true` for *this* caller.
- **`returnLines`** / **`formReasons`** (computed) — derived from `options.returnable` and `options.reasons` (minus `'withdrawal'`, which the panel handles separately).
- **`handleWithdraw`** — `singleFlight`-guarded; opens a confirmation dialog, then calls `openReturn({ reason: 'withdrawal' })`; on failure, blocks the button in place via `useBlockingError`.
- **`handleReturnOpened` / `handleRecorded` / `handleCanceled`** — thin wrappers that emit `'opened'` and call `loadOpened()`.
- **`loadOpened`** — `Promise.all` of `fetchOrderReturns` and `fetchReturnOptions`; failures leave the refs empty rather than blocking the UI.
- **Template** — conditionally renders the withdrawal button (enabled, disabled-with-reason, or hidden), the record-withdrawal section, the cancel-remainder list, and the return-request form.

## Relationships

- **`src/modules/returns/store.ts`** — imports `useReturnsStore` for `openReturn`, `fetchOrderReturns`, `fetchReturnOptions`, and the shared `loading` ref.
- **`src/modules/returns/components/CancelRemainderDialog.vue`** — child component; one instance per cancelable fulfillment, opened via the `cancelling` ref; emits back to trigger `handleCanceled`.
- **`src/modules/returns/components/RecordWithdrawalDialog.vue`** — child component; staff-only dialog toggled by `recordOpen`; emits back to trigger `handleRecorded`.
- **`src/modules/returns/components/ReturnRequestForm.vue`** — child component; receives `returnLines` and `formReasons`; emits back to trigger `handleReturnOpened`.
- **`src/modules/returns/index.ts`** — re-exports the component (or a barrel that includes it) for parent pages to import.
- **`src/modules/returns/tests/withdrawal-panel.spec.ts`** — unit/integration tests for the panel's render conditions, permission gating, and interaction with the store.

## Notes

- The component renders **nothing** (the outer `<section>` is `v-if`-gated) unless at least one affordance is present, so an empty order shows no panel at all.
- `handleWithdraw` is wrapped in `singleFlight` to prevent double-submit; the `loading` store ref additionally disables the button during any in-flight store call.
- The "contact us" link is only shown when the router actually has a `Contact` route (`hasContact` computed), accommodating builds that omit the `tasks` module.
- `withdrawBlocked` causes the button to render **disabled with a visible reason** rather than being hidden — the directive requires the buyer to see *why* and how to escalate.
- The `withdraw` reason is deliberately excluded from `formReasons` because it is handled by the dedicated confirmation flow, not the general return form.
