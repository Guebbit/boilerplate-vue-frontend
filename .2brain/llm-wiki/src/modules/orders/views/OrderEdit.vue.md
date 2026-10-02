---
source: src/modules/orders/views/OrderEdit.vue
sha256: 56fb5e4c56e94a6dc415c9084cd266a1c5d3e6164bf8b868c10ccdcb93cce0e1
generated_at: 2026-10-02T15:25:33.603727+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrderEdit.vue

## Purpose

Operator-facing page for viewing and editing a single order. It loads the order by route `id`, exposes a minimal email-only edit form, and provides the operator's status actions (cancel, refund, status-override) — each gated on the `actions` array the server attaches to the order record.

## Key elements

- **`runOverride`** — Submits a status correction via `overrideStatus(id, target, reason)`. Gated on `overrideTargets` (the server-provided `actions.override` list). Uses a dedicated `useBlockingError` so the error renders inline next to the control.
- **`runCancel(withRefund)`** — Calls `cancelOrder`, then `refreshPayment` to re-read the sibling payment record (the order's cache entry does not know about payment state). Shared across the "Cancel" and "Cancel & Refund" buttons.
- **`runRefund`** — Returns money (full or partial) without changing order status. Partial amount is a free-text field; empty = full refund, positive number = goodwill amount.
- **`onOfflinePaymentRecorded`** — After a successful "record offline payment" form submission, forces a re-fetch (`fetchOrder(id, { forced: true })`) because the order's status moved `pending → paid` server-side.
- **`editSchema` / `useStructureFormValidation`** — Zod-validated form with a single `email` field. Auto-hydrates from the fetched record; revalidates on locale change.
- **`canCancel` / `canRefund` / `canCancelAndRefund` / `canRecordOffline` / `canOverride`** — Computed booleans derived entirely from `currentOrder.value?.actions` and `useOrderRefund`. No local rules; the server decides what is available.
- **`refundAmount` / `refundAmountInvalid`** — Parses the partial-refund text into a number or `NaN`; invalid values block the submit and show a field-level error.

## Relationships

No direct import or reference to the listed graph neighbors (`logger.ts`, `TwoFactorChallenge.vue`) is visible in the provided content. All dependencies resolve to the orders store, the payments composable, the vue-toolkit form/validation helpers, and shared UI organisms.

## Notes

- **Status is never a form field.** It changes exclusively through `runCancel` and `runOverride`; the form schema contains only `email`. See `docs/theory/tactical-ddd.md` referenced in the code.
- **Multiple independent `useBlockingError` instances** — the edit form, the override section, the three money-action buttons, and the offline-payment refresh each get their own inline error slot rather than a single toast queue.
- **Payment re-read is explicit.** After cancel-with-refund or refund, `refreshPayment()` is called because the order's Pinia cache entry has no knowledge of the payment record.
- **`overrideStatus` writes through the store's `updateTarget`**, which replaces both the cached record and its query-cache entry — no separate forced fetch is needed after a successful override.
- **`refundAmountText` empty string = full refund.** A non-numeric or non-positive value produces `NaN` in `refundAmount`, which both blocks submission and drives the field's invalid state.
