---
source: src/modules/delivery/tests/hold-dialog.spec.ts
sha256: 5f95dba0fcdda248fcc064592bd924058144249626cbd9ae96dd9fbfb84ccb52
signature: ff1c44c813df08491acf9cd106e705139ff05cc55f09d6433046a3410ff952f3
generated_at: 2026-11-10T04:19:29.627624+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/hold-dialog.spec.ts

## Purpose

Unit tests for the `HoldDialog.vue` component, verifying the staff workflow for holding a fulfillment order: reason validation, the allowed reason set, note/message handling (including trimming), and in-dialog error display on refusal.

## Key elements

- **`openDialog()`** – Mounts `HoldDialog` with `VDialog` stubbed to a bare `<slot/>`, spies on `useDeliveryStore().hold`, then opens the dialog by setting `modelValue: true`. Returns `{ wrapper, hold }`.
- **`beforeEach`** – Resets Pinia and loads the `en` locale for every test.
- **5 `it` cases** – Cover: submit disabled until a reason is picked; the exact three-reason list (`incorrect_address`, `high_risk`, `other`) excluding `awaiting_stock`; successful submit sending reason + trimmed note, closing the dialog, and emitting `held`/`update:modelValue`; buyer message sent alongside staff note; refusal leaving the error visible in-dialog without emitting `held`.

## Relationships

- **`src/modules/delivery/components/HoldDialog.vue`** – The component under test; mounted via `mount(HoldDialog, …)`.
- **`src/modules/delivery/store.ts`** – `useDeliveryStore` is imported and its `hold` action is mocked per test to control return values and simulate rejection.
- **`tests/support/unit/fixtures.ts`** – `aFulfillmentOrder()` supplies the fixture object passed as the `fulfillmentOrder` prop and as the mock return value.
- **`tests/support/unit/mounted-vm.ts`** – `emitOn` simulates component `update:modelValue` events; `nextRenderTick` flushes Vue reactivity between assertions.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers module-level test doubles before any test runs.

## Notes

- `VDialog` is stubbed **inline** in the `mount` call (`stubs: { VDialog: { template: '<div><slot /></div>' } }`), not via a global plugin stub—so the dialog never actually toggles visibility; it is "opened" purely by flipping the `modelValue` prop.
- The test asserts `awaiting_stock` is **absent** from the `VSelect` items; this is a business-rule guard, not just a list check.
- Note text is expected to be **trimmed** before reaching `hold` (e.g. `'  check card '` → `'check card'`); the buyer message in the separate textarea is also trimmed.
- On refusal the dialog does **not** emit `update:modelValue(false)`; it stays open so the staff member can correct the input.
