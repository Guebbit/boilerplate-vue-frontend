---
source: src/modules/orders/tests/order-edit-view.spec.ts
sha256: 83606d59cf61f5323bcc9b5f1bec814d8d580e6edf2af5229c25f6ad27395acc
generated_at: 2026-10-02T15:22:08.705132+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-edit-view.spec.ts

## Purpose

Verifies that `OrderEdit.vue` gains its `actions` payload the same way `Order.vue` does: when a list-cache arrival seeds the store with a summary row (no `actions`), the page must still surface its cancel/refund/override controls once the forced re-fetch (`useOrderActionsRefetch`) resolves. Mounts the real component against a real memory-history router built from `collectModuleRoutes(enabledModules)`, exercising the re-fetch path rather than pre-seeding the answer.

## Key elements

- **`mountFromListCache(detailOrder)`** — Core mount helper. Seeds the orders store with a summary row (no `actions`), spies on `fetchOrder` to return the detail row, then mounts `OrderEdit`. Returns both the wrapper and the `fetchOrder` spy so later re-fetches (e.g. `runOverride`) can be asserted.
- **`anAction(overrides)` / `anOrder(overrides)`** — Factory helpers providing sane defaults for `OrderActions` and `Order` so each test overrides only the fields under test.
- **`signInAsAdmin()`** — Populates the session store with an admin viewer so route-level access assumptions hold.
- **`vi.mock('@/modules/payments', …)`** — Replaces `useOrderRefund` with controllable `mockCanRefund`/`mockRefundLoading` refs and stubs `RecordOfflinePaymentForm` as a bare `<div>`, preventing live HTTP calls and cross-module boundary violations.
- **Router** — `createRouter` over `createMemoryHistory` with `collectModuleRoutes(enabledModules)`, scoped under `/:locale`.
- **`beforeEach`** — Fresh Pinia, cleared mocks, `loadLocale('en')`, `router.push('/en/orders/o1/edit')`, `router.isReady()`.
- **Test suites** — *list-cache arrival gains actions* (cancel enabled/disabled), *refunding* (loading gate), *partial refund* (full vs. typed amount, invalid input), *cancelling* (payment re-read after cancel).

## Relationships

- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` is called at module scope before any test runs; it registers the enabled modules' routes into the core so `collectModuleRoutes` resolves them.
- **`tests/support/unit/watch-handle.ts`** — `noopWatchHandle` is returned from the mocked `watchOrder` inside `mountFromListCache`, suppressing the store's real subscription to order mutations.
- **`tests/support/unit/mounted-vm.ts`** — `emitOn` is imported (available for dispatching custom events on the mounted wrapper, used in adjacent specs in this template family).

## Notes

- The `fetchOrder` spy **must** be installed before `mount()` because `OrderEdit` destructures its store actions during setup; spying after mount would miss the initial re-fetch latch.
- The double-`nextTick()` pattern (`.then(() => nextTick()).then(() => nextTick())`) is intentional: the first tick lets the `fetchOrder` promise resolve, the second lets Vue flush the re-render driven by the mutated store.
- `RecordOfflinePaymentForm` is stubbed as a static `<div>` — mounting the real component would pull in `useRecordOfflinePayment` and a live payments store this suite never seeds.
- The file follows the same structural template as `product-view.spec.ts` / `wishlist-view.spec.ts`; deviations are module-specific (orders actions, refund flow).
