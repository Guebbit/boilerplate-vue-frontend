---
source: src/modules/payments/tests/record-offline-payment-form.spec.ts
sha256: f0dc5eeda3f88ea43f26938bd07f3d71dba114adad3bac0c4bbeb8d43b8d5732
generated_at: 2026-10-02T15:31:09.529516+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/record-offline-payment-form.spec.ts

## Purpose

Vitest spec for the `RecordOfflinePaymentForm` component. It mounts the real form, spies on `usePaymentsStore().recordOfflinePayment`, and verifies that the component correctly captures user input (method, reference, received-at date), emits `recorded` only on success, and routes API refusals to either a specific field or a form-level banner. It follows the same "component owns field state, store owns the write" pattern established in `stock-movement-form.spec.ts`.

## Key elements

- **`V_SELECT_STUB`** — Local stub replacing Vuetify's `v-select` (teleport overlay is irrelevant here). Deliberately lists `bank_transfer` as the *second* option so that setting it constitutes a non-default selection.
- **`mountForm()`** — Wraps `@vue/test-utils` `mount` with the `orderId` prop, `vuetify` + `i18n` plugins, and the `VSelect` stub.
- **`beforeEach`** — Creates a fresh Pinia instance and loads the `en` locale.
- **Test: records method/reference and emits** — Submits the form, asserts `recordOfflinePayment` is called with the chosen values and `receivedAt: undefined`, and that `emitted('recorded')` has length 1.
- **Test: omits empty reference** — Submits with no reference typed; expects `reference: undefined` (not `''`) and the default method `bank_transfer`.
- **Test: date as ISO timestamp** — Sets a date, asserts the stored value round-trips to the same local calendar date (avoids timezone-coupling).
- **Test: no `recorded` emit on API refusal** — Mocks a 409 rejection; asserts `emitted('recorded')` is undefined.
- **Test: field-specific refusal** — Mocks a 422 with `field: 'reference'`; asserts the message appears in the reference field's slot and *not* in the generic banner.
- **Test: form-level refusal** — Mocks a 409 with no field; asserts the message appears in the `[data-test=record-offline-payment-error]` banner.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — Imported and invoked as `wireModulesIntoCore()` at module top-level, before any test runs. Sets up the DI/module wiring the component depends on at mount time.

## Notes

- **Default method is `bank_transfer` by enum order, not by explicit default.** The component's initial value is the first entry in the generated `RecordOfflinePaymentRequestMethod` enum. The stub's option ordering (cash first, bank_transfer second) exists solely so the "user picks something other than the default" test is meaningful.
- **`receivedAt` is `undefined`, never `''`.** Both the "no date" test and the "date set" test confirm the component omits the key rather than sending an empty string.
- **Timezone-safe date assertion.** The date test parses the stored value back into local components (`getFullYear/getMonth/getDate`) instead of comparing against a fixed UTC string, so the spec is runner-timezone-independent.
- **Store write is spied, not real.** `recordOfflinePayment` is always mocked (resolved or rejected); the actual persistence logic lives in `store.spec.ts`.
