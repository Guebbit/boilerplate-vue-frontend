---
source: src/modules/delivery/tests/fulfillment-order-card.spec.ts
sha256: 18510ca47d6239dcaf4fb84434a3f0c199fdd35a4a43f2ec282e4ec793fd6e43
signature: 3fe5459ccd766155c6b271eed9573f07cb5d3fb5be17727685dcbc4879fce070
generated_at: 2026-11-10T04:19:08.611109+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/fulfillment-order-card.spec.ts

## Purpose
Unit tests for `FulfillmentOrderCard.vue`. Verifies the card's rendered text for every fulfillment-order status and hold variant, confirms that staff action buttons are driven exclusively by the record's `actions` field (not by status or kind), and checks that successful mutations emit a `moved` event to the parent page while failures surface an in-place error without emitting. Dialog internals are covered in `ship-items-dialog.spec.ts` and are out of scope here.

## Key elements
- **`mountCard(fulfillmentOrder, extra?)`** — Mounts the card with Vuetify, i18n, and a `VDialog` stub (renders slot inline). Returns the wrapper and the live Pinia store.
- **`beforeEach`** — Creates a fresh Pinia and loads the `en` locale.
- **`describe('what a card shows')`** — Parameterised status→label checks, hold-reason/notice/message rendering for staff vs. buyer, line-item shipped/cancelled counts, digital badge, and shipment list.
- **`describe('the buttons come from actions')`** — Asserts each button (`open-ship`, `mark-fulfilled`, `open-hold`, `release`) appears iff the corresponding `actions` flag is true. Spies on `store.fulfill` / `store.release` to verify the correct id is passed and `moved` is emitted; the rejection path shows `[data-test=fulfillment-order-error]` and emits nothing.
- **`describe('a late preorder')`** — Promised-date display and absence of answer buttons for `awaiting_stock` preorders.

## Relationships
- **`src/modules/delivery/components/FulfillmentOrderCard.vue`** — The SUT; imported and mounted by `mountCard`.
- **`src/modules/delivery/store.ts`** — `useDeliveryStore` provides `fulfill` and `release`, which are spied on to assert call arguments and side-effects.
- **`tests/support/unit/fixtures.ts`** — Supplies `aFulfillmentOrder` and `aShipment` factory objects (default id `fo1`).
- **`tests/support/unit/mounted-vm.ts`** — Exports `nextRenderTick`, awaited after trigger clicks to let async DOM updates settle.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register Vuetify/i18n into the test runtime before any mount occurs.

## Notes
- `VDialog` is stubbed to a plain `<div><slot /></div>` so dialog content renders inline and is assertable without teleport/portal gymnastics.
- `wireModulesIntoCore()` runs once at import time, not per test; do not move it into `beforeEach` or Vuetify will be missing.
- The card communicates success to its parent via a `moved` event; the test asserts `wrapper.emitted('moved')` has length 1 on success and is `undefined` on failure.
- `holdReason` (staff chip), `holdNotice` (buyer-facing category), and `holdMessage` (buyer-facing prose) are three distinct fields; the test asserts each renders in its own `data-test` slot and that `hold-reason` is absent for buyer-only views.
- The truncated last test (`'a late preorder'`) checks that a `2027-03-01` agreed date renders under `[data-test=fulfillment-order-promised]` with no interactive question/answer elements.
