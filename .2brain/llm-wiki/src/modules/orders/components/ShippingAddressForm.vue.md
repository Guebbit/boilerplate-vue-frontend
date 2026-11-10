---
source: src/modules/orders/components/ShippingAddressForm.vue
sha256: eb5c1ea1f54ddfb192bd851b3e924acdb85dee4ad58395cbcd30bc889124a26e
signature: eb5c1ea1f54ddfb192bd851b3e924acdb85dee4ad58395cbcd30bc889124a26e
generated_at: 2026-11-10T04:58:10.707995+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/components/ShippingAddressForm.vue

## Purpose

A Vuetify form that lets staff correct the shipping address of an unshipped order whose `incorrect_address` hold-group is active. It pre-fills from the order's current address, validates client-side via a Zod schema, and delegates the write to the orders store. The owning page controls *when* the form is visible (based on `actions.correctAddress`); this component only handles the submit flow.

## Key elements

- **`props`** – `orderId: string` and optional `address: OrderAddress`; the form initializes its fields from `address`.
- **`emit('corrected')`** – fires after a successful store call so the parent can re-fetch the order and its history.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – wires `form` state, `formErrors`, `showFormErrors`, `handleSubmit`, and `applyServerErrors`. Re-validates on `locale` change and toasts on invalid submit.
- **`countryOptions`** – computed array of `{ value, title }` derived from `ISO_COUNTRY_CODES`, sorted by localized label.
- **`useBlockingError`** – local "blocked" state (`addressError`, `reportAddressError`, `clearAddressError`). When the server rejects the correction (e.g. order shipped meanwhile), the error is surfaced inline via `InlineErrorAlert` rather than as a toast.
- **`submit`** – calls `handleSubmit`, strips an empty `phone` before sending, invokes `ordersStore.correctShippingAddress`, toasts success, emits `corrected`, or routes server errors through `applyServerErrors` (unmapped → `reportAddressError`).
- **`loading`** – sourced from `storeToRefs(ordersStore)`; disables the submit button to prevent double-submits.
- **Named `<script>` block** – exports `{ name: 'ShippingAddressForm' }` for devtools / `<KeepAlive>` compatibility (required because `<script setup>` cannot set a component name).

## Relationships

- **`src/modules/orders/schemas.ts`** – imports `shippingAddressCorrectionSchema`, the Zod schema that drives all client-side field validation.
- **`src/modules/orders/store.ts`** – imports `useOrdersStore`; calls `correctShippingAddress` on submit and reads the global `loading` flag to gate the button.
- **`src/modules/orders/views/OrderEdit.vue`** – parent view that conditionally renders this form and listens for the `corrected` emit to refresh order data.
- **`src/modules/orders/tests/shipping-address-form.spec.ts`** – unit/integration tests for this component.

## Notes

- `phone` is optional: it is omitted from the payload entirely when empty (`...(phone ? { phone } : {})`), so the schema must treat it as non-required.
- The form uses `novalidate` on the `<form>` element and relies entirely on the toolkit's validation; native HTML5 constraint validation is suppressed.
- `InlineErrorAlert` (the `addressError` slot) is the only channel for a *blocking* server-side refusal; field-level server errors are mapped onto `formErrors` via `applyServerErrors`.
- The `data-test` attributes on every field and the submit button are the stable hooks the spec file targets.
