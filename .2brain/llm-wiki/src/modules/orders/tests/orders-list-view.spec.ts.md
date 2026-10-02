---
source: src/modules/orders/tests/orders-list-view.spec.ts
sha256: 3673f951e943cee6a4ddb020e61f8489c1f196ce0a58c77425d4a616b939a404
generated_at: 2026-10-02T15:23:09.016810+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/orders-list-view.spec.ts

## Purpose

Page-level integration test for the `OrdersList` view. It verifies the *mount decisions* the page makes (what is rendered and for whom) and a small set of page-owned behaviors (soft-delete restore action, filter visibility by role, server-side header sorting, order-number display). It deliberately does **not** test the internals of `OrderReferenceSearch` or the store's fetch logic, which are covered in their own suites.

## Key elements

- **`wireModulesIntoCore()`** (called at module scope) — wires the enabled modules' stores into the Pinia app before any test runs.
- **`vi.mock('@api')`** — mocks only `searchOrders` from the API barrel; every other `@api` export passes through via `importOriginal`.
- **`mountList()`** — mounts `OrdersList` with `OrderReferenceSearch` stubbed by name and `watchSearchOrders` replaced by a no-op stub. Returns the Vue Test Utils wrapper.
- **`signInAsPaymentRecorder()` / `signInAsOrderDeleter()` / `signInAsOrderEditor()`** — set up a fake session with a single ability key (`create Payment`, `delete Order`, `update Order`) to drive permission-gated assertions.
- **`order(id, deletedAt?)`** — builds a full contract `Order` object from `anOrder` for use in mocked API responses.
- **`mountWithRows()`** — mounts the list with a *real* `searchOrders` response (one row) so that header-click sorting can be observed against the store and the API call.
- **`headOf(wrapper, title)`** — locates a `<th>` by visible text for sort-click tests.
- **Five `describe` blocks** — RF-reference lookup mount & emit→navigate, soft-deleted row restore, filter visibility (customer vs staff), server-side header sorting, and the order-number/id fallback column.

## Relationships

| Neighbor | Interaction |
|---|---|
| `contracts/rest/index.ts` | Source of the `searchOrders` function imported from `@api`; mocked at the top of the file so individual suites can control its return value. |
| `tests/support/stub.ts` | Provides `asStub<T>()`, used to type-safe-wrplain objects as call-return stubs (`watchSearchOrders`, `searchOrders`). |
| `tests/support/unit/fixtures.ts` | Provides `anOrder()`, the base factory for realistic order fixtures in both the emit test and the soft-delete/sort/order-number suites. |
| `tests/support/unit/mounted-vm.ts` | Provides `emitOn()` to fire a `found` event on the stubbed `OrderReferenceSearch` without re-implementing DOM dispatch. |
| `tests/support/unit/wire-modules.ts` | Provides `wireModulesIntoCore()`, called once at module scope to register module stores before tests execute. |
| `tests/unit/infrastructure/http/orval-fixture-schema.ts` | Provides `contractResponse(schemas.SearchOrdersResponse, …)` to build API responses that match the generated Orval schema shape. |

## Notes

- **Stub-by-name, not barrel-mock.** `OrderReferenceSearch` is registered as a named stub (`{ name: 'OrderReferenceSearch', template: '<div />' }`) so the test asserts the *page's decision to render it*, not its behavior. This also prevents its setup from firing a real HTTP call.
- **Two mounting strategies coexist.** `mountList()` stubs the table fetch (`watchSearchOrders`) and is used for mount/permission/filter assertions. The soft-delete, sorting, and order-number suites instead mock `searchOrders` at the `@api` level and let the real store run, because those assertions depend on the rendered table rows.
- **FA86 / FA38 comments** reference acceptance criteria: FA86 documents that `OrderReferenceSearch` emits rather than navigates (no `MODULE_EDGES` into `orders`), and FA38 documents that customer-facing filters exclude staff-only lookups and the transfer queue.
- **Router is real (memory history)** but scoped to `collectModuleRoutes(enabledModules)`, so the navigation assertion in the emit test exercises actual route resolution.
- The `beforeEach` pushes `/en/orders` and awaits `router.isReady()`; tests that assert navigation must use `vi.waitFor` rather than a single `flushPromises` tick.
