---
source: src/modules/returns/components/CancelRemainderDialog.vue
sha256: 44b859c8a906d0c3cf1ea5ae7b62bf47246eb301621f12090a37bb39d347c750
signature: 44b859c8a906d0c3cf1ea5ae7b62bf47246eb301621f12090a37bb39d347c750
generated_at: 2026-11-10T05:35:33.797257+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/components/CancelRemainderDialog.vue

## Purpose

A confirmation dialog that cancels the unshipped remainder of a single fulfillment order. It displays the server-provided refund amount (from `GET /returns/options`) and submits a `POST /returns` cancellation. It serves two callers in one component: the buyer (reason fixed to `withdrawal`, no note) and staff (reason `other` with a required note, or optionally recording the buyer's own withdrawal with its date and channel).

## Key elements

- **`props`** — `orderId`, `currency`, `option` (`CancelableFulfillmentOrder`), and `mode` (`'buyer' | 'staff'`).
- **`emit('canceled')`** — fired once the cancellation succeeds so the parent page can re-fetch the order.
- **`isOpen` (`defineModel`)** — v-model controlling dialog visibility; a `watch` resets all local fields each time the dialog opens.
- **`submit()`** — validates the statement fields (staff + as-withdrawal path), then calls `openReturn` from the store with `kind: 'cancellation'`. On success it toasts, closes the dialog, and emits. On failure it routes the error to the local `useBlockingError` slot.
- **`asWithdrawal` / `requestedAt` / `statedVia`** — staff-only state for recording the buyer's own withdrawal; validated via `isStatedInTime` and `isStatementChannel` from the domain layer.
- **`statementOk` (computed)** — gates submission when the as-withdrawal path is active.
- **`cancelError` / `reportCancelError` / `clearCancelError`** — from `useBlockingError`; renders the error inline next to the confirm button via `InlineErrorAlert`.
- **`refundText` / `shippingText` (computed)** — formatted currency strings for display; shipping line hidden unless the value is non-zero.

## Relationships

- **`src/modules/returns/store.ts`** — source of `openReturn` (the API call) and `loading` (disables the confirm button during in-flight requests).
- **`src/modules/returns/domain/statement.ts`** — provides `STATEMENT_CHANNELS`, `isStatedInTime`, `isStatementChannel`, and `localToIso` for validating and converting the buyer-stated date/channel.
- **`src/modules/returns/components/StatedAtFields.vue`** — rendered when staff check "as withdrawal"; two-way bound to `requestedAt` and `statedVia`, receives per-field error arrays.
- **`src/modules/returns/tests/cancel-remainder-dialog.spec.ts`** — unit/integration tests for this component.

## Notes

- The refund amount shown to the user always comes from the server response (`option.refundAmount`), never computed client-side.
- Staff "as withdrawal" is distinct from the buyer's own withdrawal: the `reason` field is `'withdrawal'` in both cases, but the buyer path omits `note` entirely while the staff path omits `note` *and* includes `requestedAt`/`statedVia`.
- The `note` field is conditionally spread into the payload (`...(condition ? { note } : {})`), so a blank note sends nothing rather than an empty string.
- `triedStatement` is a "dirty check" flag: validation errors on `StatedAtFields` are only surfaced after the user has clicked confirm at least once.
- The step-up auth prompt for the staff refund key lives in the HTTP layer (outside this component), so it appears before `openReturn` resolves.
