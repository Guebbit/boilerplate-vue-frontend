---
source: src/modules/orders/tests/order-view.spec.ts
sha256: 8a1311b30a7f149bb7eb35d60eae97cfb242cb01e8b899f424238765e7611fe1
generated_at: 2026-10-17T01:18:18.224083+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-view.spec.ts

## Purpose

Vitest spec for the `Order.vue` detail page. It mounts the real component against a memory-history router and asserts that each line's picture resolves live from `item.current` (never a frozen `item.product.imageUrl`), that invoice/credit-note buttons appear and behave correctly, and that the order number, timeline, payment deadline, and VAT summary render from the store's seeded data. `watchOrder` is stubbed so the store's own fetch never fires; the order is injected directly into the dictionary.

## Key elements

- **`mountOrder(order)`** – Seeds `useOrdersStore` (spies on `watchOrder` with `noopWatchHandle`, calls `addOrder`, sets `selectedOrderId`) and mounts `Order.vue` with router, Vuetify, i18n plugins. Stubs `PaymentPanel`, `ShipmentPanel`, `WithdrawalPanel`, and `OrderTimeline` so their own data-fetches don't run.
- **`lineWith(current)`** – Builds a single order line with a fixed product and the given `current` value, for use as the only varying field across tests.
- **`BASE_ORDER`** – Full order fixture (no `items`) with a default `actions` object where every flag is `false`.
- **`invoicedOrder()`** – Returns `BASE_ORDER` with `actions.invoice = true`, the precondition for credit-note tests.
- **`signInAsShopper()`** – Populates the session store (token, viewer, abilities) so the CART store's TanStack-tracked `loading` state is reachable.
- **`vi.mock('@api', …)`** – Wraps `reorder` as `vi.fn(actual.reorder)` (pass-through by default; only the in-flight-guard test overrides). Mocks `listOrderCreditNotes` → empty list and `getOrderCreditNote` → a fake PDF blob.
- **`vi.mock('@guebbit/js-toolkit', …)`** – Replaces `downloadBlob` with a spy.
- **Router** – Built with `createMemoryHistory` and `collectModuleRoutes(enabledModules)` after `wireModulesIntoCore()` is called at module scope.
- **`beforeEach`** – Resets Pinia, signs in as shopper, loads the `en` locale, and pushes `/en/orders/o1` so `router.isReady()` resolves.
- **`describe` blocks** – Invoice buttons, credit notes (list, per-row download, server-error path), order number, timeline key, payment deadline, VAT summary.

## Relationships

| Neighbor | Interaction |
|---|---|
| `src/modules/orders/views/Order.vue` | The component under test; mounted directly by `mountOrder`. |
| `src/modules/orders/store.ts` | `useOrdersStore` is imported; `watchOrder` is spied, `addOrder` and `selectedOrderId` are set to seed state. |
| `contracts/rest/index.ts` | Resolved via the `@api` alias; `reorder`, `listOrderCreditNotes`, `getOrderCreditNote` are the mocked exports. |
| `tests/support/stub.ts` | `asStub` is imported (helper for stubbing in test setup). |
| `tests/support/unit/watch-handle.ts` | `noopWatchHandle` is returned from the `watchOrder` spy to suppress the real subscription. |
| `tests/support/unit/mounted-vm.ts` | `nextRenderTick` is imported for render-timing assertions. |
| `tests/support/unit/wire-modules.ts` | `wireModulesIntoCore()` is called once at module scope before the router is created. |

## Notes

- The `reorder` mock intentionally **wraps the real implementation** (`vi.fn(actual.reorder)`); every test that does not explicitly override it will call through to the actual API function. Only the in-flight-guard test replaces the implementation.
- `wireModulesIntoCore()` runs at **module top-level**, not inside `beforeEach`, so it executes once per test-file import.
- The four panel/timeline components are stubbed with `true` (render nothing) because they perform their own data fetches and no mocked transport is provided for them; the spec only verifies that `Order.vue` passes the correct props.
- `signInAsShopper` is required in `beforeEach` because the CART store's `loading` flag is real TanStack Query state—nothing short of an actual in-flight request can flip it, and the reorder in-flight test depends on that.
