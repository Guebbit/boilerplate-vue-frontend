---
source: src/modules/payments/tests/order-reference-search.spec.ts
sha256: 1821e97eb9ddeff390a9b56997c5c65254b023cb3b528d8a65a23d774e0dffcd
generated_at: 2026-10-17T01:24:36.432470+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/order-reference-search.spec.ts

## Purpose

Vitest component test for `OrderReferenceSearch`. Verifies the component's contract: it emits a `found` event with the matched order (or renders an inline error) and nothing more. It explicitly does **not** navigate — the payments module declares no `MODULE_EDGES` into `orders`, so routing to `OrderEdit` is the host's responsibility (covered in `orders-list-view.spec.ts`).

## Key elements

- **`anOrder(id)`** – Factory returning a minimal `Order` literal for mocking.
- **`mountSearch()`** – Mounts `OrderReferenceSearch` with Vuetify and i18n plugins via `@vue/test-utils`.
- **`inlineMessage(wrapper)`** – `vi.waitFor` helper that resolves once the `[data-test=order-reference-search-error]` element is in the DOM.
- **`describe('OrderReferenceSearch')`** – Five cases:
  - Emits `found` with the order and clears the input; asserts no navigation side-effect.
  - Renders a `text-warning` inline message when `findOrderByReference` resolves `undefined`; no `found` event.
  - Removes the inline message as soon as the operator types again.
  - Renders a `text-error` inline message (not a toast) on a rejected promise with a 500-shaped error object.
  - Disables the submit button while the input field is blank.

## Relationships

- **`OrderReferenceSearch.vue`** – The SUT. The test mounts it directly and asserts on its emitted events, DOM state, and data-test attributes.
- **`store.ts` (`usePaymentsStore`)** – Spied on via `vi.spyOn(payments, 'findOrderByReference')` in every case to control the async lookup result. The test asserts the component passes the raw reference string through and that the component itself performs no store mutation beyond reading the result.

## Notes

- Follows the same "spy the store's own read" pattern as `record-offline-payment-form.spec.ts`; the component is tested in isolation from any router.
- `beforeEach` creates a fresh Pinia instance **and** loads the `en` locale — both are required because the component depends on `i18n` for its inline messages.
- All async assertions use `vi.waitFor` rather than `await` on Promises, which keeps the tests resilient to microtask ordering.
