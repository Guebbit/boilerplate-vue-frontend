---
source: src/modules/orders/views/OrderEdit.vue
sha256: 61d62c3f4afd162b83c4d90eba3acc14a14343c05e84e9b9e1f39b79ebfb5173
generated_at: 2026-10-17T01:20:26.141215+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrderEdit.vue

## Purpose

Order-edit page for a single order (identified by route prop `id`). It renders an email-only edit form, a read-only order-detail hero, and a set of operator money/status actions (cancel, refund, status-override, record offline payment) whose availability is governed entirely by the server-attached `actions` object on the loaded record.

## Key elements

- **`OrderEditPage`** (named block) — stable component name for devtools / `<KeepAlive>`.
- **`OrderEditForm`** interface — the only editable field is `email`; `status` is deliberately excluded (moves via cancel/override actions only).
- **`editSchema`** (zod) — validates the email field; reuses `ordersSchema.shape.email` so the rule cannot drift.
- **`useStructureFormValidation`** call — provides `form`, `formErrors`, `handleSubmit`, `resetForm`, `activateAutoHydrate`, `applyServerErrors`, and locale-revalidation wiring.
- **`runOverride`** — POSTs a status correction (`overrideStatus`), clears the inline blocking error, toasts on success.
- **`runCancel`** — cancels the order (optionally with refund via `cancelOrder(id, withRefund)`), then refreshes the payment record.
- **`runRefund`** — full or partial refund via `refund(refundAmount.value)`; partial amount is free-text parsed to `number | undefined | NaN`.
- **`onOfflinePaymentRecorded`** — forced re-fetch (`fetchOrder(id, { forced: true })`) after a manual payment recording mutates status server-side.
- **`canCancel` / `canCancelAndRefund` / `canRefund` / `canRecordOffline` / `canOverride`** — computed flags derived from the server's `actions` object and the session's `create:Payment` permission.
- **Three `useBlockingError` instances** — one each for the override door, the offline-payment refresh, and the combined cancel/refund/refund-only action cluster.

## Relationships

- **`../store.ts` (`useOrdersStore`)** — primary data source: `currentOrder`, `loading`, `fetchOrder`, `cancelOrder`, `overrideStatus`. `storeToRefs` keeps the component reactive to store updates.
- **`../schemas.ts` (`ordersSchema`)** — supplies the canonical email validation rule used by `editSchema`.
- **`../composables/use-order-actions-refetch.ts` (`useOrderActionsRefetch`)** — imported; used (in the truncated portion) to re-fetch the `actions` list after mutations.
- **`@/modules/payments` (`useOrderRefund`, `RecordOfflinePaymentForm`)** — provides `canRefund`, `refund`, `refreshPayment`, `refundLoading` and the offline-payment sub-form.
- **`src/modules/orders/tests/order-edit-view.spec.ts`** — dedicated unit/integration spec for this component.

## Notes

- `status` is **not** a form field by design (see `docs/theory/tactical-ddd.md` reference in the code). It changes only through the cancel and override action calls.
- Every action gate is the server's `actions` object on the record — there is no local permission logic for cancel/refund/override beyond the session check for `create:Payment` on offline recording.
- `runCancel` explicitly calls `refreshPayment()` after the order write because the payment is a sibling record not covered by the order's `updateTarget` cache write; without it a `withRefund` cancel could leave "Refund only" still enabled.
- The refund amount field uses `Number.NaN` (not a throw) to signal invalid input so the UI can show a field-level error without sending a request.
- The component relies on `@guebbit/vue-toolkit` for `useStructureFormValidation` and `useNotificationsStore`; the form auto-hydrates from `currentOrder.email` once the fetch resolves.
