---
source: src/modules/delivery/tests/preorder-fulfillment-table.spec.ts
sha256: 4db4ef783862d3413f8046e7864fdc29806fe362ca5c9a5021ff4b3580d60e32
generated_at: 2026-10-17T00:49:10.763613+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/preorder-fulfillment-table.spec.ts

## Purpose

Unit test for the `PreorderFulfillmentTable.vue` component (the delivery board's second tab). It verifies two concerns: that the component forwards the correct filter parameters to the store's `fetchPreorderBoard` call, and that each rendered row displays the expected state, late/slip indicators, consent deadline, or cancellation reason.

## Key elements

- **`mountTable(rows, props?)`** — local helper that creates a fresh Pinia, spies on `store.fetchPreorderBoard` to return the supplied rows, mounts the component with router + vuetify + i18n plugins, and resolves with `{ wrapper, read }`.
- **`router`** — module-level memory-history router built from `collectModuleRoutes(enabledModules)` so in-row order links (e.g. `/en/orders/o7`) resolve to a real route.
- **`describe('what the table asks for')`** — four tests asserting the exact arguments passed to the spied read: default page params, `late: true`, `dueWithin: 7`, and `productId` narrowing (including chip-removal emitting `clearProduct`).
- **`describe('what a row says')`** — six tests covering order link/name/buyer/lines, late flag + slip (`+12 d`), absence of late indicators on on-time rows, consent deadline ("Answer by"), cancel reason text, and the empty-state message.
- **`wireModulesIntoCore()`** — called at module scope (before any test) to register module side-effects needed by the router.
- **`aPreorderFulfillmentOrder(overrides?)`** — fixture factory imported from test support; used to build realistic row objects per test.

## Relationships

- **`PreorderFulfillmentTable.vue`** — the system under test; this spec mounts it and asserts on its DOM and store calls.
- **`store.ts`** (`useDeliveryStore`) — the store instance is obtained via Pinia and its `fetchPreorderBoard` method is spied; `preorderBoard` / `preorderBoardTotal` are set directly in the mock implementation.
- **`tests/support/unit/fixtures.ts`** — supplies the `aPreorderFulfillmentOrder` factory used throughout.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called once at import time so that `collectModuleRoutes(enabledModules)` returns a populated route tree.

## Notes

- The store read is **spied**, not hit over the network. Tests assert *what the component asks for* (filter params), not what the server returns. `late` and `dueWithin` are treated as pass-through values; the component never recomputes them.
- `beforeEach` pushes `/en/sales/preorders` and calls `loadLocale('en')` before every test — i18n keys in assertions depend on this.
- The empty-state test mounts with `[]` rows and checks for the literal string `'No fulfillment orders match.'`.
- `dueWithin` is asserted as the number `7` (weeks), matching the "Due-soon" switch's fixed value.
