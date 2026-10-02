---
source: src/modules/delivery/tests/shipment-panel.spec.ts
sha256: 822d714831df048911a4112c57b75c6040ce28cab83890f274aefa6fdeda046e
generated_at: 2026-10-02T15:05:20.533780+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/shipment-panel.spec.ts

## Purpose

Unit test suite for `ShipmentPanel.vue`, the ship/deliver action panel on the order page. It mounts the real component (with Vuetify and i18n) while stubbing the delivery store's fetch actions, then verifies which of the four template branches renders based on the `canStart`/`canFulfill`/`canShip`/`canDeliver`/`override` props (FA36/B3). It deliberately does **not** test the store's `start`/`ship`/`deliver` actions themselves (covered by `delivery/tests/store.spec.ts`) nor the server-side eligibility rules behind those props (covered by the `orders` suites).

## Key elements

- **`wireModulesIntoCore()`** — called at module top-level (from `tests/support/unit/wire-modules.ts`) to register module wiring before any test runs.
- **`vi.mock('@api')`** — wraps `deliverOrder` in `vi.fn(actual.deliverOrder)` so it calls through to the real implementation by default; only the in-flight-guard test overrides it with a pending promise.
- **`mountPanel(props)`** — local helper that (1) grabs the delivery store, (2) spies on `fetchMethods` and `fetchShipmentForOrder` *before* mounting, then (3) mounts `ShipmentPanel` with the given props and Vuetify/i18n plugins. Returns a `VueWrapper`.
- **`beforeEach`** — resets Pinia (`setActivePinia(createPinia())`) and loads the `en` locale.
- **`describe` blocks** — organised by template branch: *start-fulfilment door (Q6)*, *digital-fulfilment door*, *with no shipment yet*, *with a shipment already recorded*, and *re-checking the record belongs to this order (FA24)*.
- **FA35 error-display tests** — verify that a 409/422 rejection from the store's action is surfaced via `[data-test=shipment-panel-error]` rather than swallowed.
- **In-flight guard test** — uses a manually-constructed never-resolving promise as a one-time mock return for `deliverOrder`, then asserts the button becomes `disabled` while the call is pending.
- **FA24 tests** — verify the panel re-fetches when `orderId` changes without a remount, and stops rendering a stale `shipment` from a previous order before the new fetch resolves.

## Relationships

- **`tests/support/unit/mounted-vm.ts`** — provides `nextRenderTick(wrapper)`, a helper that flushes Vue's render queue so assertions can observe post-click DOM updates (used throughout for async error and in-flight assertions).
- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore()`, called once at module scope to register the delivery module (and its store) in the global wiring so `useDeliveryStore()` resolves correctly inside the mounted component.

## Notes

- Spies on `fetchMethods`/`fetchShipmentForOrder` must be attached **before** `mount()`, because `onMounted` captures the function reference at that instant; a spy attached afterward would never replace the stored reference.
- The `deliverOrder` mock is intentionally a pass-through wrapper (`vi.fn(actual.deliverOrder)`). Every other test spies on the *store's* `deliver`/`ship`/`start`/`fulfill` actions, which never reach the API layer. Only the in-flight-guard test needs to control the API call directly, because the store's `loading` flag is real TanStack-tracked state that only a genuine in-flight request can set.
- Element selection relies on `data-test` attributes (`mark-started`, `mark-fulfilled`, `mark-shipped`, `mark-delivered`, `force-ship-toggle`, `force-deliver-toggle`, `shipment-panel-error`) rather than selectors or text.
- FA-prefixed identifiers (FA24, FA35, FA36, B3) are internal bug/feature tracking references for the specific regressions these tests guard against.
