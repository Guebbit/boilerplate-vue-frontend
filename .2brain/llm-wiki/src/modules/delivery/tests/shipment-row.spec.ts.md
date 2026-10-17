---
source: src/modules/delivery/tests/shipment-row.spec.ts
sha256: 53892d0dcf2b51e6f4c49f3e45b8b9a3aa7711955bc3a1231dbb9aa8c8eac12a
generated_at: 2026-10-17T00:50:00.338555+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipment-row.spec.ts

## Purpose

Vitest unit-test suite for `ShipmentRow.vue`. It mounts the real component against a real Pinia store (with write methods spied) to verify three behaviours: the row renders shipment metadata correctly, staff controls appear only when the shipment's `actions` field permits them, and the forced-arrival path is gated on both an override toggle and a reason string.

## Key elements

- **`mountRow(shipment, canForce?)`** — local helper that mounts `ShipmentRow` with vuetify + i18n plugins and returns the test-utils wrapper alongside the active `useDeliveryStore()` instance.
- **`beforeEach`** — resets Pinia via `setActivePinia(createPinia())` and loads the `en` locale.
- **`describe('what a row shows')`** — asserts status label, tracking code, dates, and line-items via `data-test` selectors.
- **`describe('the controls come from actions')`** — covers the "mark delivered" click, the tracking-edit form (save button disabled until value changes), and the inline error path when `store.deliver` rejects (no `moved` emission).
- **`describe('the forced arrival')`** — verifies the toggle + reason gate: without `canForce` the toggle is absent; with it, the button stays disabled until a reason is entered, then calls `store.deliver(id, true, reason)`.

## Relationships

- **`src/modules/delivery/components/ShipmentRow.vue`** — the component under test; mounted directly.
- **`src/modules/delivery/store.ts`** — provides `useDeliveryStore`; its `deliver` and `editTracking` methods are spied with `vi.spyOn` to capture call arguments and to mock resolution/rejection.
- **`tests/support/unit/fixtures.ts`** — supplies the `aShipment` factory (defaults to id `'s1'`, no actions) used in every test case.
- **`tests/support/unit/mounted-vm.ts`** — supplies `nextRenderTick`, used after each interaction to let Vue flush reactivity before assertions.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is invoked at module scope (once per file load) to register module bindings the component expects.

## Notes

- Selectors are `data-test` attributes throughout, not CSS classes; add the attribute to the component if you add new assertions.
- Error-path tests assert the **absence** of a `moved` emission (`toBeUndefined()`) — the contract is that failures stay local to the row.
- The tracking-save button's disabled state is asserted via the `disabled` HTML attribute (defined vs. undefined), not via a Vue prop.
- `wireModulesIntoCore()` runs at import time, not inside `beforeEach`; a test that unmounts/remounts many times still shares the same module registry for the whole file.
