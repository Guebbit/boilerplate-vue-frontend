---
source: src/modules/delivery/tests/ship-items-dialog.spec.ts
sha256: cd73e5bf3f7e2e8715ade40a2364c1ef90f6657648a1671338fc6c2123830518
generated_at: 2026-10-17T00:49:24.883709+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/ship-items-dialog.spec.ts

## Purpose

Component-level test for `ShipItemsDialog.vue`. It mounts the real dialog with Vuetify's `VDialog` stubbed to render its slot inline, spies on the delivery store's `ship` action, and asserts the dialog's form behaviour: quantity defaults and validation, the tracked-method tracking-code rule, the forced-shipping door (toggle + reason), and the refusal path that keeps the dialog open. Explicitly out of scope: the ship-line arithmetic (covered by `ship-lines.spec.ts`).

## Key elements

- **`SHIPPABLE`** — a one-line fulfillment-order fixture (product `p1`, 2 units remaining) with `ship: true`; used as the "ordinary door open" scenario.
- **`openDialog(fulfillmentOrder, extra?)`** — helper that mounts the dialog with `modelValue: false`, spies on `useDeliveryStore().ship`, then flips `modelValue` to `true` via `setProps`. Returns the wrapper and the spied `ship` function. `extra` accepts `trackingRequired` and `canForce`.
- **`describe('the quantities')`** — verifies the input defaults to remaining quantity, that a submitted form calls `ship` with explicit lines and emits `shipped` + `update:modelValue`, and that over-quantity input shows an invalid marker and disables submit.
- **`describe('the tracking code')`** — verifies the code is optional on untracked methods (trimmed on submit) and required when `trackingRequired` is true.
- **`describe('the forced door')`** — verifies the force toggle is hidden when the ordinary door is open or `canForce` is false; when shown, both toggle and reason must be set before submit, and the call carries `forced: true` with the reason.
- **`describe('a refusal')`** — mocks `ship` to reject with `DELIVERY_LINES_INVALID`; asserts the error text is displayed, and neither `shipped` nor `update:modelValue` is emitted (dialog stays open).

## Relationships

- **`src/modules/delivery/components/ShipItemsDialog.vue`** — the component under test; mounted directly via `@vue/test-utils`.
- **`src/modules/delivery/store.ts`** — `useDeliveryStore().ship` is spied and mocked for every assertion on outgoing calls.
- **`tests/support/unit/fixtures.ts`** — supplies `aFulfillmentOrder` and `aShipment` factory helpers used to build the `SHIPPABLE` fixture and the mock return value.
- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick` to flush Vue rendering before reading DOM or emitted events.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module top-level (import side-effect) to make the component's internal module registry available in the test environment.

## Notes

- The `VDialog` stub is a minimal `<div><slot /></div>`; no Vuetify dialog transitions or overlay logic are exercised.
- `openDialog` relies on the `false → true` `modelValue` transition to trigger the form's re-seed; calling `setProps` after mount is intentional and mirrors the real open/close lifecycle.
- Element selection uses `data-test` attributes (e.g. `ship-quantity-p1`, `ship-submit`, `ship-force-toggle`) rather than CSS classes or Vuetify selectors.
- `wireModulesIntoCore()` runs once per test-file import (module scope), not per test case; it is a global side-effect that must be present before any component is mounted.
