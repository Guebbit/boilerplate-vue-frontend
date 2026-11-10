---
source: src/modules/payments/tests/record-offline-payment-form.spec.ts
sha256: 0d2662e226bd4330ac684e0bd94057b2882e05985af47c5b6bccce9581c834c3
signature: 81fa8f057dc4b1bf1130a49fc40cdcc75b4ea128e2030ffafa05520a0cc27304
generated_at: 2026-11-10T05:16:21.072474+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/tests/record-offline-payment-form.spec.ts

## Purpose

Component-level Vitest suite for `RecordOfflinePaymentForm.vue`. It mounts the real form, stubs Vuetify's `VSelect`, spies on the store's `recordOfflinePayment` write, and verifies that the form correctly composes user input into the store call, maps API refusals to the right UI surface (field-level vs. banner), and emits `recorded` only on success.

## Key elements

- **`V_SELECT_STUB`** – Replaces `v-select` with a plain `<select>` so no teleported overlay is needed. Lists `cash` first, `bank_transfer` second, because `bank_transfer` is the enum default; placing it second keeps the "user picks a non-default" test meaningful.
- **`mountForm()`** – Helper that mounts `RecordOfflinePaymentForm` with Vuetify + i18n plugins and the `VSelect` stub. Passes `orderId: 'order-1'`.
- **`describe('RecordOfflinePaymentForm')`** – Six `it` blocks:
  - Records a chosen method + reference and emits `recorded` once the store call resolves.
  - Omits an empty reference (sends `undefined`, not `''`), defaulting the method to the enum's first value.
  - Converts a chosen date into a full ISO timestamp (asserts by round-tripping through `Date` in local time to avoid runner-timezone coupling).
  - Does **not** emit `recorded` when the store call rejects.
  - Places a field-named validation error on the relevant input, not in the banner.
  - Blocks the form in place (banner) for a refusal that names no field.

## Relationships

- **`RecordOfflinePaymentForm.vue`** – The component under test; this file mounts it and interacts with its DOM via `data-test` attributes.
- **`store.ts`** – Provides `usePaymentsStore`; the suite spies on its `recordOfflinePayment` method to capture the outgoing payload and to inject success/rejection outcomes.
- **`tests/support/unit/fixtures.ts`** – Supplies the `aProblem(status, errors)` helper used to fabricate structured API error responses (409 conflict, 422 validation).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope before any test runs to register the app's DI/module wiring that the component expects.

## Notes

- Follows the same "spy on the store's own write" pattern as `stock-movement-form.spec.ts`; the store's internal logic is covered separately in `store.spec.ts`.
- The date assertion deliberately avoids comparing a literal UTC string; it parses the stored value and checks the local-year/month/day triple, keeping the test timezone-independent.
- DOM queries rely on `data-test` attributes rather than class names, decoupling tests from Vuetify's generated markup.
- `beforeEach` resets Pinia and loads the `en` locale before every case to avoid cross-test state leakage.
