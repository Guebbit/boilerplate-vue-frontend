---
source: src/modules/delivery/tests/preorder-fulfillment-table.spec.ts
sha256: fa2b50367e6647ef75ef47d7247c51921640941526dc9cb89cebee3d11d01b3a
signature: 782b762b1da05c6166174f7bd3b21b9537e3d3249518489a4d5cd9adfd0b84ac
generated_at: 2026-11-10T04:19:42.425514+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/tests/preorder-fulfillment-table.spec.ts

## Purpose

Unit-test suite for `PreorderFulfillmentTable.vue` (the delivery board's second tab). It verifies two things: (1) the filter parameters the component passes to the store's `fetchPreorderBoard` read (Late, Due-soon, product), and (2) what each rendered row displays (state label, late flag, slip days, deadline, cancellation reason). The store read is always spied; no real network call is made.

## Key elements

- **`mountTable(rows, props)`** — Local helper that spies on `store.fetchPreorderBoard`, sets `preorderBoard`/`preorderBoardTotal` on the store, mounts the component with router + Vuetify + i18n, and returns `{ wrapper, read }` after `flushPromises`.
- **`router`** — A real `vue-router` instance with `createMemoryHistory` and the full module route tree (`collectModuleRoutes(enabledModules)`), so order links resolve to real paths like `/en/orders/:id`.
- **`wireModulesIntoCore()`** — Called once at module top-level to register enabled modules with the kernel registry before any test runs.
- **Three `describe` blocks:**
  - *"what the table asks for"* — asserts the shape of the `fetchPreorderBoard` call args (page, pageSize, state, productId, late, dueWithin).
  - *"what the URL carries"* — asserts filter state is written to the query as `fulfillment-*` keys and read back from a shared URL before the first fetch.
  - *"what a row says"* — asserts per-row DOM: order link, buyer email, line summary, state label, late/slip badges, "No date yet", cancel reason, empty-state message, and the paid-hint text.
- **`beforeEach`** — Resets Pinia (`setActivePinia(createPinia())`) and pushes the router to `/en/sales/preorders` + loads the `en` locale before every test.

## Relationships

- **`src/modules/delivery/components/PreorderFulfillmentTable.vue`** — the component under test; mounted directly via `@vue/test-utils`.
- **`src/modules/delivery/store.ts`** — `useDeliveryStore` is pulled from this store; `fetchPreorderBoard` is the method that gets spied and mocked.
- **`tests/support/unit/fixtures.ts`** — provides the `aPreorderFulfillmentOrder` factory used to build realistic row data (orderId, orderNumber, buyer, lines, state, late flag, etc.).
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` is invoked at import time so the module registry knows which routes exist, enabling the router to resolve order links.

## Notes

- The "Due-soon" toggle maps to a hardcoded `dueWithin: 7` (days). The component does not compute the window; it just passes the number to the server.
- The URL-persistence test uses a bare `setTimeout(…, 50)` after `flushPromises` because `router.replace` schedules a microtask that `flushPromises` does not cover. This is the only async workaround in the file.
- All filter values (`late`, `dueWithin`, `state`) are treated as opaque pass-throughs to the server — the test asserts they arrive unchanged, never re-deriving the business rule.
- The `preorder-paid-hint` element is expected to be absent when the board is empty, not merely empty-text.
