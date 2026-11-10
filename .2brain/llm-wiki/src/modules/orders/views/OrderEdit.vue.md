---
source: src/modules/orders/views/OrderEdit.vue
sha256: 1ca81a64cdacbb9d23dcee583a284f333737f0896d2834679ac1c920f3b227cc
signature: 1ca81a64cdacbb9d23dcee583a284f333737f0896d2834679ac1c920f3b227cc
generated_at: 2026-11-10T05:06:01.103423+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/views/OrderEdit.vue

## Purpose

Single-file Vue component that renders the operator's order-edit page. It loads one order by route id, exposes an email-only edit form, and presents the operator's cancel / refund / status-override / offline-payment / address-correction actions — each gated on the `actions` flags the server attaches to the loaded record.

## Key elements

- **`OrderEditPage`** (default export) — stable component name for devtools and `<KeepAlive>`, declared in a separate `<script>` block because `<script setup>` cannot set `name`.
- **`runOverride`** — submits a status correction via the store's `overrideStatus`; clears its own `useBlockingError` state on success, reports inline on failure.
- **`runCancel(withRefund)` / `cancelOnce`** — cancels the order (optionally with refund); refreshes the payment record afterward so the "Refund only" button greys out correctly.
- **`runRefund` / `refundOnce`** — full or partial refund; `refundAmount` computed normalises the typed decimal, `refundAmountInvalid` blocks submission.
- **`runSettle(refundId, amount)`** — confirms via a dialog that a hand-paid refund was settled outside the app; no API call.
- **`runExclusive`** — an `exclusiveRunner()` instance shared by all three money-action buttons; a second press joins the in-flight call rather than firing a duplicate (no Idempotency-Key sent).
- **`overrideTargets` / `canOverride` / `overrideStatusOptions`** — computed directly from `currentOrder.actions.override`; the select only shows statuses the server says this caller can reach.
- **`canCancel` / `canCancelAndRefund` / `canRefund`** — each reads its own server flag; the combined button requires both halves to be true.
- **`canRecordOffline`** — requires both `actions.recordPayment === true` and the session's `create:Payment` permission.
- **`canCorrectAddress`** — reads `actions.correctAddress`; the shipping-address form is rendered only when true.
- **`onOfflinePaymentRecorded` / `onAddressCorrected`** — both call `fetchOrder(id, { forced: true })` to bypass the store's stale cache after a mutation the cache hasn't absorbed.
- **Three `useBlockingError` instances** — one per section (override door, offline-payment refresh, money actions) so errors display inline rather than in a toast the operator may miss.

## Relationships

- **`src/modules/orders/store.ts`** — primary data source: `useOrdersStore` provides `watchOrder`, `fetchOrder`, `cancelOrder`, `overrideStatus`, and the `currentOrder` / `loading` refs via `storeToRefs`.
- **`src/modules/orders/schemas.ts`** — `ordersSchema` (zod) feeds the `useStructureFormValidation` form for the email field.
- **`src/modules/orders/composables/use-order-hero.ts`** — `useOrderHero` supplies the hero-section data (status badge, key figures) displayed at the top of the page.
- **`src/modules/orders/components/ShippingAddressForm.vue`** — rendered as a child component when `canCorrectAddress` is true; emits an event that triggers `onAddressCorrected`.
- **`src/modules/orders/tests/order-edit-view.spec.ts`** — unit/integration test spec for this component.

## Notes

- **Status is not a form field.** It changes only through the cancel and override actions; the email form never writes `status`.
- **`exclusiveRunner` gate is deliberate.** The three money-action endpoints do not carry an `Idempotency-Key`, so a rapid double-click would otherwise produce a second request that the server rejects with 409. The gate serialises them.
- **Forced re-fetch after offline payment / address correction.** `watchOrder`'s cache still holds the pre-mutation record, so both handlers call `fetchOrder` with `{ forced: true }` rather than relying on cache invalidation.
- **`canRecordOffline` is a two-part check.** The server flag (`actions.recordPayment`) and the session permission (`create:Payment`) are independent; an in-flight card charge is a *narrower* case the flag does not express — the API's 409 surfaces as the form's own toast.
- **`refundAmount` uses the viewer's locale** for decimal-separator parsing (`getCurrentLocale()`); the server ultimately enforces the currency's max decimal places.
