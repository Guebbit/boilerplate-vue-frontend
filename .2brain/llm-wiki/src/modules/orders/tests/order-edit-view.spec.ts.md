---
source: src/modules/orders/tests/order-edit-view.spec.ts
sha256: a03bea9d628dbbbe0a97f7995da4bd851c9c9e99d34fd206c8174158ef030c71
signature: 2b435109c1f26a964d9c652ba06e9e365f4b8253e6252287f535fdf913553cb9
generated_at: 2026-11-10T05:02:44.826988+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-edit-view.spec.ts

## Purpose

Test suite for `OrderEdit.vue` that proves the page renders its action controls (cancel, refund, override, settle) directly from the order's `actions` field as delivered by a list-cache arrival—without requiring a second fetch. It also verifies refund flows (full, partial, validation) and settling hand-paid refunds. Follows the same structural template as `product-view.spec.ts` and `wishlist-view.spec.ts`.

## Key elements

- **`mountFromListCache(detailOrder)`** — Seeds `useOrdersStore` with the order, stubs `watchOrder` with `noopWatchHandle`, spies on `fetchOrder` *before* mounting, then mounts `OrderEdit` with the real router/Vuetify/i18n. Returns `{ wrapper, fetchOrder }`.
- **`signInAsAdmin(abilities?)`** — Populates `useSessionStore` with a token, admin viewer, and tenant abilities.
- **`anAction(overrides?)` / `anOrder(overrides?)`** — Factory helpers returning all-false `OrderActions` and a minimal `Order` respectively; each test overrides only the fields its scenario exercises.
- **`mountRefundable()`** — Composite helper: signs in, sets `mockCanRefund = true`, mounts via `mountFromListCache`, resolves two ticks, returns the wrapper.
- **`vi.mock('@/modules/payments', …)`** — Replaces the entire payments barrel with stubs: `useOrderRefund` (returning reactive refs `mockCanRefund`, `mockSettleable`, `mockRefundLoading` and fn stubs `refund`, `settle`, `refreshPayment`), plus empty-template components `RecordOfflinePaymentForm` and `OrderDisputes`.
- **`router`** — A `createMemoryHistory` router wrapping `collectModuleRoutes(enabledModules)` under `/:locale`.
- **`describe` blocks** — *"a list-cache arrival gains actions"*, *"refunding"*, *"a partial refund"*, *"marking a hand-paid refund as returned"*.

## Relationships

- **`src/modules/orders/views/OrderEdit.vue`** — The component under test; mounted directly with `{ id }` prop and the shared router/Vuetify/i18n plugins.
- **`src/modules/orders/store.ts`** — `useOrdersStore` is the source of the order row; `watchOrder` is stubbed with `noopWatchHandle`, `fetchOrder` is spied (forced re-fetch), `addOrder` and `selectedOrderId` are set before mount.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope to register module side-effects required by `collectModuleRoutes`.
- **`tests/support/unit/watch-handle.ts`** — `noopWatchHandle` is the mock return value for `watchOrder`, suppressing real subscription logic.
- **`tests/support/unit/mounted-vm.ts`** — `emitOn` is imported (used in truncated portions for event emission assertions).

## Notes

- The payments module is mocked wholesale because `useOrderRefund` would issue a real HTTP call, and reaching the payments store directly is forbidden by `eslint-plugin-boundaries` for sibling modules. `OrderDisputes` and `RecordOfflinePaymentForm` are stubbed for the same reason.
- The `fetchOrder` spy must be attached **before** `mount()` because `OrderEdit` destructures its actions off the store during `setup`; a later assertion on a forced re-fetch depends on this ordering.
- The bespoke router carries **no** `access: 'admin'` guard, yet `signInAsAdmin` is still called to satisfy any component-level session checks.
- Reactivity assertions use `nextTick().then(() => nextTick())` rather than a single tick, because the re-fetch promise resolution and the subsequent Vue render are two separate microtask boundaries.
- `beforeEach` resets the Pinia instance, clears all payment mocks, resets reactive refs, and navigates the router to `/en/orders/o1/edit` before each test.
