# src/modules/orders/views/OrderEdit.vue

## Purpose

Single order-edit page. It loads an order by route `id`, exposes a status + email form (validated via `useStructureFormValidation`), and renders the operator's cancel / cancel-and-refund / refund-only buttons. Every actionable control is gated on the `actions` object the server attaches to the loaded record, so the UI never offers a transition or money operation the API would reject.

## Key elements

- **`statusOptions`** – `computed` that builds the select items from `currentOrder.actions.transitions` (server-defined reachable statuses) plus the current status, labelled via i18n. Deliberately does **not** enumerate the full `OrderStatus` union.
- **`canCancel` / `canCancelAndRefund` / `canRefund`** – Reactive booleans derived from `actions.cancel` (order store) and `useOrderRefund` (payments module). Controls the disabled state of the three action buttons.
- **`runCancel(withRefund)`** – Calls `cancelOrder(id, withRefund)` from the orders store, then toasts success or routes the error through `notifyErrorMessages`.
- **`runRefund()`** – Calls `refund()` from `useOrderRefund`, toasts on settle.
- **`editSchema`** – Zod object: optional `ordersStatusSchema` + optional email (empty string preprocessed to `undefined`).
- **`useStructureFormValidation`** – Provides `form`, `handleSubmit`, `applyServerErrors`, `activateAutoHydrate`, `resetForm`, etc. Auto-hydrates from `currentOrder` once the fetch resolves; revalidates on locale change.
- **`submitForm`** – Validates, then calls `updateOrder(id, { status, email })`. Server errors are first passed to `applyServerErrors` (field-level); unhandled ones become toasts.
- **`watchOrder(() => id)`** – Triggers the store's fetch when the route param changes.
- **`useOrderActionsRefetch`** – Forces one re-fetch so an order arriving from the list-cache picks up its `actions` payload before the first render.
- **`heroTitle` / `heroDescription` / `orderStatus`** – Display computed props for the hero card and stat cards.

## Relationships

- **`src/infrastructure/utils/errors.ts`** – Imports `notifyErrorMessages` and `VUETIFY_INVALID_FIELD_SELECTOR`; all `.catch` blocks on order/payment calls funnel through `notifyErrorMessages(addMessage, error)`.
- **`@/modules/orders/store.ts`** – Primary data source: `watchOrder`, `fetchOrder`, `updateOrder`, `cancelOrder`, `currentOrder`, `loading`.
- **`@/modules/payments` (`useOrderRefund`)** – Supplies `canRefund` and the `refund()` call; reads the payment record on the same route `id`.
- **`@/modules/orders/composables/use-order-actions-refetch.ts`** – Ensures the `actions` field is present before the template first renders.
- **`@/modules/orders/schemas.ts`** – `ordersStatusSchema` used inside the Zod form schema.
- **`@guebbit/vue-toolkit`** – `useStructureFormValidation` (form state, submission, server-error mapping) and `useNotificationsStore` (toasts).
- **`src/infrastructure/utils/logger.ts`** – Listed as a dependency-graph neighbor, but no direct import or call to it is visible in this file's source.

## Notes

- **Status options are server-driven, not enum-driven.** The old pattern of listing all six `OrderStatus` values in the select caused 409s on most invalid transitions. The page trusts `actions.transitions` exclusively.
- **`actions` may be absent on cache hits.** An order loaded from the list-page cache does not carry `actions`; without `useOrderActionsRefetch`, the status select shows only the current value and Cancel appears disabled.
- **Email field uses `z.preprocess`** to convert empty strings to `undefined` before the email validator runs, so an intentionally-blank email is valid.
- **`id` is a route prop (optional).** Every mutation path (`submitForm`, `runCancel`) short-circuits to a no-op when `id` is falsy.
- **Refund and cancel are independent.** "Cancel and refund" is simply `cancelOrder(id, true)` — a single API call that the server treats atomically. A standalone refund (`runRefund`) does not change order status.
