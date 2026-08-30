# src/modules/orders/views/OrderEdit.vue

## Purpose

Operator-facing page for editing a single order. Loads the order by route `id`, presents a status + email form, and exposes cancel / refund / cancel-and-refund actions. All available actions and status transitions are driven by flags the server attaches to the loaded record (`actions.transitions`, `actions.cancel`) and by the payment's own refund eligibility, so the UI never offers a call the API would reject.

## Key elements

- **`statusOptions`** – Computed list built from `currentOrder.actions.transitions` plus the current status. Intentionally *not* derived from the `OrderStatus` enum to avoid a client-side copy of lifecycle rules that can drift from the server.
- **`canCancel` / `canRefund` / `canCancelAndRefund`** – Gate the three operator buttons. `canCancel` reads `actions.cancel` from the order; `canRefund` comes from `useOrderRefund`; `canCancelAndRefund` is their conjunction.
- **`runCancel(withRefund)`** – Calls `cancelOrder(id, withRefund)` from the orders store; toasts success or surfaces API errors via `notifyErrorMessages`.
- **`runRefund()`** – Calls `refund()` from `useOrderRefund`; toasts on completion.
- **`editSchema`** (Zod) – Validates `status` (optional, via `ordersStatusSchema`) and `email` (optional; empty string coerced to `undefined`).
- **`submitForm`** – Validates through `useAppForm.handleSubmit`, then calls `updateOrder(id, { status, email })`. Falls back to `applyServerErrors` before showing a generic toast.
- **`activateAutoHydrate`** – Populates the form with `currentOrder.status` and `currentOrder.email` once the fetch resolves.
- **`watchOrder(() => id)`** – Triggers a (re)fetch whenever the route id changes. `useOrderRefund` independently re-reads the payment on the same id.

## Relationships

No direct import or usage of `src/infrastructure/utils/logger.ts` is present in this file. All logging/side-effect output goes through `useNotificationsStore.addMessage` and `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`).

## Notes

- Status transitions are **server-authoritative**: the component reads `actions.transitions` rather than enumerating `OrderStatus`. The doc comment explicitly calls out that a client-side copy is how the two systems come to disagree.
- The three money-action buttons are disabled independently (`canCancel`, `canRefund`) rather than by a single client-side rule, so each greys out on its own server-supplied flag.
- `runCancel` with `withRefund = true` is the combined "cancel and refund" path; a plain refund (`runRefund`) does **not** change order status.
- The file uses `defineProps<{ id?: string }>()` for the route param; all store calls guard on `id` being present.
- Layout is provided by `LayoutDefault`; visual composition uses `ItemDetailLayout`, `ItemDetailHero`, `CardMaterialStat`, `CardDetail`, and `CardInfo` from `@/ui/organisms`.
