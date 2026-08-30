# src/modules/orders/views/Order.vue

## Purpose

Order detail page (component name `OrderTargetPage`) that renders a single order's information, status, line items, and action buttons for both customer and operator roles. It loads the order by route `id`, ensures the full detail representation (with server-computed `actions`) is fetched even when a summary row already exists in the Pinia cache, and delegates payment and shipment workflows to self-contained module panels.

## Key elements

- **`cancellable`** (computed) — reads `currentOrder.actions?.cancel` to decide whether the cancel button is available. Deliberately trusts the server's `actions` field rather than re-implementing lifecycle rules locally.
- **`handleCancel`** — opens a confirmation dialog (`useDialogStore().confirm`), then calls `cancelOrder(id)` from the orders store; toasts success or surfaces errors via `notifyErrorMessages`.
- **`handleReorder`** — calls `useCartStore().reorder(orderId)`, navigates to the Cart route, and toasts the outcome.
- **`heroTitle` / `heroDescription` / `orderStatus`** (computed) — derive display strings from `currentOrder` with sensible fallbacks (route id, i18n title, `EMPTY_VALUE` glyph).
- **`downloadInvoice`** — fetches a PDF blob from the orders store and triggers a browser download via `downloadBlob` from `@guebbit/js-toolkit`.
- **`watchOrder(() => id)`** — pins the store's active order to the route param; re-fetches on navigation.
- **`refreshedForActions` guard + `watch(currentOrder, …)`** — if the resolved order lacks `actions` (i.e. it came from the list-cache summary), issues exactly one forced `fetchOrder(id, { forced: true })`. The one-shot flag prevents racing the toolkit's loading lock.
- **Template** — `LayoutDefault` shell with `ItemDetailLayout` hero, `CardMaterialStat` row (status / total / item count), a `CardDetail` grid of `ItemDetailField`s, and an aside containing `CardInfo`, `PaymentPanel`, `ShipmentPanel`, shipping metadata, and an item list.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — No direct import in this file. The only plausible link is indirect: `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`) may forward messages to the logger internally. No direct call or re-export of the logger is visible in the component.

## Notes

- The `refreshedForActions` flag is intentionally one-shot. Removing it (or resetting it on route change) would re-trigger a forced fetch that races the toolkit's in-flight loading lock; an e2e test previously caught a cancel click being silently swallowed during that window.
- `cancellable` is a *read*, not a local re-derivation. The comment explicitly warns that duplicating server-side lifecycle rules in the client would create a "second opinion in a separately deployed codebase" and diverge on the first API change.
- `PaymentPanel` and `ShipmentPanel` each re-fetch the order when their own module advances the status; the page listens for `@paid` / `@advanced` and calls `fetchOrder(id, { forced: true })` to stay in sync without coupling to the panels' internals.
- The file is truncated in the source listing; the item-loop `<article>` block and any trailing closing tags are not visible here.
