---
source: src/modules/delivery/tests/report-lost-dialog.spec.ts
sha256: 2f3eafab7d9c8ca20d2375a28671b970219d3e1bbdac8463bc06e1b74b3e6587
signature: c686ef0f6978f5008e98cb0867bdc22e8ae8e7a8a09218b7dea02a0f56420203
generated_at: 2026-11-10T04:20:00.120570+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/report-lost-dialog.spec.ts

## Purpose

Unit tests for `ReportLostDialog.vue`, the staff-facing dialog used to report a parcel as lost or damaged. Verifies submission gating, the two available reasons, field trimming, optional-field omission, and in-place error display on store rejection.

## Key elements

- **`openDialog()`** – Local helper that spies on `useDeliveryStore().markLost`, mounts the real dialog with `VDialog` stubbed inline (`<div><slot /></div>`), then opens it via `setProps({ modelValue: true })`. Returns the wrapper and the spy.
- **`beforeEach`** – Resets Pinia (`setActivePinia(createPinia())`) and loads the `'en'` locale.
- **`describe('ReportLostDialog')`** – Four test cases:
  - *Cannot be sent until a reason is chosen* – submit button is `disabled`; form submit does not invoke `markLost`.
  - *Offers lost and damaged* – `VSelect` items are exactly `['lost', 'damaged']`.
  - *Sends reason, note, and buyer's message trimmed; closes on success* – Asserts `markLost` called with trimmed strings, `'reported'` emitted once, and `update:modelValue` set to `false`.
  - *Leaves empty texts out; shows refusal in place* – Empty note/message omitted from payload; rejected promise surfaces the error in `[data-test=report-lost-error]` without emitting `'reported'`.

## Relationships

- **`src/modules/delivery/components/ReportLostDialog.vue`** – The system under test; mounted directly via `@vue/test-utils`.
- **`src/modules/delivery/store.ts`** – `useDeliveryStore` is imported so `markLost` can be spied on; no other store interaction is mocked.
- **`tests/support/unit/fixtures.ts`** – Supplies the `aShipment()` fixture used as the dialog's `shipment` prop and as the mock resolved value.
- **`tests/support/unit/mounted-vm.ts`** – Provides `emitOn` (to trigger VSelect `update:modelValue`) and `nextRenderTick` (to flush Vue reactivity before assertions).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module top-level to make module registries available to the component tree under test.

## Notes

- Tests use promise-chaining (`.then()`) rather than `async/await`, consistent with the surrounding test-suite style.
- `VDialog` is stubbed inline per-test rather than via a shared Vuetify stub, keeping the dialog's slot content visible without Vuetify's overlay machinery.
- The dialog is opened by flipping the `v-model` prop, not by simulating a user click on an open trigger.
- `markLost` is spied on the live store instance inside `openDialog`, so each test gets a fresh spy tied to the `beforeEach` Pinia reset.
