---
source: src/modules/returns/tests/cancel-remainder-dialog.spec.ts
sha256: 6a872325b00d09187c31b2a727732ad24e500d0912ca713dfdbe76f052428e7a
generated_at: 2026-10-17T01:38:12.911475+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/tests/cancel-remainder-dialog.spec.ts

## Purpose
Unit-test spec for `CancelRemainderDialog.vue`. Verifies what the dialog renders (remainder lines, computed refund, conditional shipping note, staff-only note field) and what payload it dispatches to the store on confirm, including the error path where the server refuses the cancellation.

## Key elements

- **`OPTION`** – Local fixture: a `CancellableFulfillmentOrder` for one unit ("Mug"), refund 12.50, no shipping refund. Used as the default `option` prop.
- **`mountDialog(mode, option?)`** – Helper that mounts the dialog with `modelValue: true`, Vuetify + i18n plugins, an inline `VDialog` stub (plain slot div), and `useReturnsStore().openReturn` spied to resolve a closed cancellation return. Returns `{ wrapper, openReturn }`.
- **`beforeEach`** – Resets Pinia and loads the `en` locale.
- **`describe('what the dialog shows')`** – Three cases: lines + refund rendered; shipping element appears only when `shippingRefund > 0`; note textarea present in `staff` mode, absent in `buyer` mode.
- **`describe('what it sends')`** – Three cases: buyer confirm calls `openReturn` with `reason: 'withdrawal'` and emits `cancelled` + `update:modelValue`; staff confirm calls it with `reason: 'other'` and a trimmed `note`; a rejected `openReturn` surfaces the error code in `[data-test=cancel-remainder-error]` without closing the dialog or emitting.

## Relationships

- **`src/modules/returns/components/CancelRemainderDialog.vue`** – The component under test; imported directly and mounted with test props.
- **`src/modules/returns/store.ts`** – `useReturnsStore` is called inside `mountDialog` so its `openReturn` action can be spied and asserted on.
- **`tests/support/unit/fixtures.ts`** – Provides the `aReturn` factory used as the resolved value of the `openReturn` mock.
- **`tests/support/unit/mounted-vm.ts`** – Supplies `nextRenderTick`, a small async-flush helper awaited after trigger clicks.
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is invoked once at module top-level to register shared module wiring before any test runs.

## Notes

- The `VDialog` stub is defined inline as a one-line template rather than pulled from a shared stub file, so dialog open/close animation logic is bypassed.
- `wireModulesIntoCore()` is a side-effect call at import time; it is not wrapped in `beforeEach`.
- Selectors throughout use `data-test` attributes on the component, not Vuetify class names.
- Staff-mode note is expected to be trimmed (test input `' out of stock for good '` → expected `'out of stock for good'`), which documents a trimming responsibility on the component side.
