---
source: src/modules/orders/tests/orders-list-view.spec.ts
sha256: deefef398a87b3ba388f9ee3aa8e8f43ef14530efa9057e8409024d0f4723c28
generated_at: 2026-10-17T01:18:38.555159+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/orders-list-view.spec.ts

## Purpose

Page-level integration tests for `OrdersList.vue`. The suite verifies what the page *decides* to render and wire up—permission-gated actions, row-level buttons (Restore / Delete / Hard-Delete), filter visibility by scope, and the server-side sort contract—without re-testing the internal logic of child components (e.g. `OrderReferenceSearch` is stubbed by name). It exists so regressions in the page's conditional rendering and ability checks are caught at the page boundary rather than buried in component unit tests.

## Key elements

- **`wireModulesIntoCore()`** – module-level side-effect call that populates the registry so `collectModuleRoutes` and store wiring work.
- **`vi.mock('@guebbit/js-toolkit')`** – replaces `downloadBlob` with a no-op spy to avoid real file downloads.
- **`vi.mock('@api')`** – replaces `searchOrders` with a controllable `vi.fn()`; only the soft-delete and filter suites actually resolve it, the lookup suite stubs the component out entirely.
- **`router`** – a memory-history Vue Router scoped to `enabledModules` routes, prefixed with `/:locale`.
- **`signInAsPaymentRecorder`** – sets session abilities to `[['create','Payment']]`, the gate for showing `OrderReferenceSearch`.
- **`signInAsOrderDeleter`** – sets `[['delete','Order']]`, the gate for row action buttons.
- **`signInReadingOrders(pinnedToOwner)`** – sets a read rule either pinned to `userId: 'u1'` (customer) or wide (staff) to test filter visibility.
- **`order(id, deletedAt?)`** – builds a full contract-shape order fixture via `anOrder` with the fields every table column needs.
- **`mountList(scope)`** – mounts `OrdersList` with `watchSearchOrders` spied out and `OrderReferenceSearch` stubbed as an empty `<div />`; accepts `'mine'` or `'all'` scope.
- **`mountWithRows()`** – mounts the page with `searchOrders` resolving one fixture row, for header-sort assertions.
- **`headOf(wrapper, title)`** – locates a `<th>` cell by its visible text.
- **Describe blocks:**
  - *RF-reference lookup* – mount visibility by ability + scope; navigation to `/orders/:id/edit` on `found` emit.
  - *Soft-deleted row* – Restore button appears in place of Delete; calls `store.restoreOrder(id)`.
  - *Permanent-delete action* – `row-hard-delete` shown only on cancelled + unpaid rows.
  - *Filter visibility* – User-ID lookup and transfer-queue filter hidden for customers; shown on staff page for wide-read viewers.
  - *Header sorting* (truncated) – API-sortable columns trigger a new `searchOrders` with `filters.sort`; non-sortable columns stay inert.

## Relationships

- **`src/modules/orders/views/OrdersList.vue`** – the component under test; mounted directly with `mount()`.
- **`src/modules/orders/store.ts`** – `useOrdersStore` is imported for spying (`watchSearchOrders`, `restoreOrder`) and asserting store-level effects.
- **`contracts/rest/index.ts`** – provides `searchOrders` (mocked), `downloadBlob` (mocked), and the `schemas` namespace used by `contractResponse`.
- **`tests/support/stub.ts`** – `asStub<T>()` wraps plain objects so their shape satisfies the return type of the spied function.
- **`tests/support/unit/fixtures.ts`** – `anOrder()` factory used to build order payloads with sensible defaults.
- **`tests/support/unit/mounted-vm.ts`** – `emitOn()` triggers a named event on a found child component (used for the `found` emit test).
- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` registers module stores/routes so the real app wiring is active.
- **`tests/unit/infrastructure/http/orval-fixture-schema.ts`** – `contractResponse(schema, body)` builds a properly-shaped API response object from a generated schema, ensuring the mock matches the contract.

## Notes

- `OrderReferenceSearch` is **stubbed by component name** (`stubs: { OrderReferenceSearch: {...} }`) rather than mocked through the `@api` barrel. This is deliberate: the test asserts *that the page renders it*, not *what it does*, and it prevents the child's own setup from firing a real HTTP call.
- The lookup suite does **not** test the search field or the navigation logic inside `OrderReferenceSearch`—those live in `payments/tests/order-reference-search.spec.ts`. Here, `emitOn(..., 'found', ...)` simulates the child's output and the page's own `router.push` is what's asserted.
- `mountList` spies out `watchSearchOrders` entirely; only the soft-delete and filter suites call the real (mocked) `searchOrders` so the table renders rows.
- The permanent-delete eligibility rule (cancelled **and** unpaid) is an API-level constraint; the test encodes it as a rendering assertion, not as a store-method call.
- `wireModulesIntoCore()` runs once at module import time; it is not inside `beforeEach`, so it is a one-shot side-effect for the whole file.
