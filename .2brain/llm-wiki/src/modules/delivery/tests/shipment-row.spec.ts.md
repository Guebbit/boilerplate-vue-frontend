---
source: src/modules/delivery/tests/shipment-row.spec.ts
sha256: c8c77469afc8d3f8d830bb36239cb923832aaa4a8a5703c86f6f8858002732e7
signature: c133dabdfd2ca9ccc9a94382ce5176af22206b2e143fe6e9b4a43bd74658cc42
generated_at: 2026-11-10T04:20:53.451993+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipment-row.spec.ts

## Purpose

Unit test for `ShipmentRow.vue` that verifies each staff control (mark-delivered, tracking-code form, report-lost button) renders only when the shipment's `actions` flags permit it, and that a server refusal (e.g. "already delivered") stays as an inline row error rather than propagating to the parent page.

## Key elements

- **`mountRow(shipment, orderAddress?)`** — local helper that mounts `ShipmentRow` with Vuetify + i18n plugins and returns `{ wrapper, store }` for assertion convenience.
- **`beforeEach`** — resets to a fresh Pinia instance and loads the `en` locale so i18n lookups are deterministic.
- **`describe('what a row shows')`** — asserts static display: human-readable status, tracking code, dates, and line items.
- **`describe('a parcel reported lost')`** — covers lost/damaged reason text, buyer-facing message, optional staff note, and the conditional "mark delivered" button governed by `actions.deliver`.
- **`describe('reporting a loss')`** — the "open report lost" button appears only when `actions.markLost` is true.
- **`describe('where the parcel went')`** — destination label renders only when the shipment's destination differs from the order's current shipping address (or is absent).
- **`describe('a tracked parcel still waiting for its code')`** — awaiting-tracking chip visibility and the tracking-code form (works even after delivery if `actions.update` is set).
- **`describe('the controls come from `actions`')`** — end-to-end interaction tests: clicking "mark delivered" calls `store.deliver(id)` and emits `moved`; the tracking save button stays disabled until the input differs from the current code; a rejected `deliver` call renders an inline error and does **not** emit `moved`.

## Relationships

- **`src/modules/delivery/components/ShipmentRow.vue`** — the SUT; imported and mounted directly.
- **`src/modules/delivery/store.ts`** — `useDeliveryStore()` provides the Pinia store whose methods (`deliver`, `editTracking`) are spied on to verify call arguments and success/error contracts.
- **`tests/support/unit/fixtures.ts`** — `aShipment(overrides?)` factory supplies typed shipment objects with sensible defaults (id `'s1'`).
- **`tests/support/unit/mounted-vm.ts`** — `nextRenderTick(wrapper)` flushes Vue's render queue before post-interaction assertions.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` called once at module scope to register any module-level dependencies the component expects.

## Notes

- `wireModulesIntoCore()` runs at **import time**, not inside `beforeEach`; if a new module-level dependency is added to `ShipmentRow`, it must be wired here or the test will fail with a missing-provider error.
- The parent-page contract is encoded as `emitted('moved')`: present on success, **absent** on error. The error path is asserted by checking the inline `[data-test=shipment-row-error]` element and the absence of the emission.
- The tracking save button's disabled state is toggled by comparing the input to `shipment.trackingCode`; tests assert `attributes('disabled')` is defined before and undefined after the value changes.
- `formatAddressLine` (from `@/infrastructure/utils/formatters.ts`) is used in the destination tests to produce the "current order address" string that the row compares against.
