---
source: src/modules/payments/tests/record-offline-payment-form.spec.ts
sha256: 13d52c4a2f0e3cce400fae7b36973a8f15eb7ea82821df8223a33091b19a410e
generated_at: 2026-10-17T01:25:39.191808+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/record-offline-payment-form.spec.ts

## Purpose

Unit test suite for the `RecordOfflinePaymentForm` component. It mounts the real form (with a native-`<select>` stub for Vuetify's `v-select`) and verifies field defaults, submission payload shape, and error placement, while spying on the store's `recordOfflinePayment` to confirm the component delegates the write correctly. The store's own write logic is covered separately in `store.spec.ts`.

## Key elements

- **`V_SELECT_STUB`** – Replaces Vuetify's teleported `v-select` with a plain `<select>` whose options are `cash` / `bank_transfer`. `bank_transfer` is listed second deliberately: it is the first value in the `RecordOfflinePaymentRequestMethod` enum (i.e. the field's default), so selecting it exercises the "change from default" path.
- **`mountForm()`** – Mounts `RecordOfflinePaymentForm` with `orderId: 'order-1'`, the Vuetify/i18n plugins, and the `VSelect` stub.
- **`beforeEach`** – Resets to a fresh Pinia instance and loads the `en` locale.
- **Six `it` cases** covering:
  - Happy path: sets method + reference, submits, asserts the store call and a single `recorded` emit.
  - Empty reference omitted (`undefined`, not `""`), method defaults to `bank_transfer`.
  - `receivedAt` date field serialises to an ISO timestamp (verified by round-tripping through `Date` in local time).
  - API rejection (409) → no `recorded` emit.
  - 422 with a `field` in the error → message lands on that field's `[data-test]` element, not the general banner.
  - 409 with no field → message appears in the general `[data-test=record-offline-payment-error]` banner.

## Relationships

- **`RecordOfflinePaymentForm.vue`** – The component under test; this spec mounts it and drives its form interactions.
- **`store.ts` (`usePaymentsStore`)** – Its `recordOfflinePayment` action is spied on (`vi.spyOn`) to assert the payload the component sends; the actual store logic is not exercised here.
- **`tests/support/unit/wire-modules.ts` (`wireModulesIntoCore`)** – Called once at module level to register any global modules the component or its dependencies expect before any test runs.

## Notes

- The date assertion intentionally parses the ISO string back into a `Date` and checks local calendar components rather than comparing a literal UTC string, keeping the test independent of the runner's timezone.
- Selectors rely on `data-test` attributes (`record-offline-method`, `record-offline-reference`, `record-offline-received-at`, `record-offline-payment-error`) rather than Vuetify-internal class names.
- The suite follows the same "spy the store's write, stub the overlay component" pattern documented in `stock-movement-form.spec.ts`; if that file's conventions change, keep them in sync.
