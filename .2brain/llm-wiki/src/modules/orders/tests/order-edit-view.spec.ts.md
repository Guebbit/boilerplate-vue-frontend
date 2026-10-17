---
source: src/modules/orders/tests/order-edit-view.spec.ts
sha256: 3a841b5527fd19aa63102cb56ca1ec91dad9701296b87b8227c49036048afefa
generated_at: 2026-10-17T01:17:44.472969+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-edit-view.spec.ts

## Purpose
Vitest spec that mounts `OrderEdit.vue` against a real memory-history router to verify the page gains its `actions` (cancel, refund, override controls) through the forced re-fetch path (`useOrderActionsRefetch`) rather than by pre-seeding the answer. It simulates the list-cache arrival scenario: the store holds a summary row with no `actions`, and the page must still offer the correct moves once `fetchOrder` resolves.

## Key elements
- **`mountFromListCache(detailOrder)`** — Core mounting helper. Seeds the orders store with a summary row (`actions: undefined`), selects the order, spies on `fetchOrder` (before mount), and mounts `OrderEdit` with the real router, Vuetify, and i18n. Returns `{ wrapper, fetchOrder }` so later assertions can inspect the re-fetch spy.
- **`anAction(overrides)`** — Factory returning a fully-defaulted `OrderActions` object; each test overrides only the fields relevant to its scenario.
- **`anOrder(overrides)`** — Factory returning a minimal valid `Order`; tests override status, actions, etc.
- **`signInAsAdmin(abilities?)`** — Sets the session store's token, viewer (role `admin`), and tenant abilities so route-level and component-level authorization checks pass.
- **`vi.mock('@/modules/payments')`** — Replaces `useOrderRefund` (with controllable `mockCanRefund` / `mockRefundLoading` refs) and `RecordOfflinePaymentForm` (inert template stub) to avoid live HTTP calls and cross-module store access.
- **Test suites** — `a list-cache arrival gains actions` (cancel enabled/disabled after re-fetch), `refunding` (loading-state gating), `a partial refund` (empty → full refund, typed amount, negative rejected), `cancelling` (cancel re-reads payment, re-fetch spy assertions).

## Relationships
- **`src/modules/orders/views/OrderEdit.vue`** — The component under test; imported and mounted directly.
- **`src/modules/orders/store.ts`** — `useOrdersStore` is the real store instance whose `watchOrder` is stubbed (via `noopWatchHandle`) and whose `fetchOrder` / `cancelOrder` are spied on.
- **`tests/support/unit/mounted-vm.ts`** — Provides `emitOn` (imported; used for event-emission assertions in the truncated portion).
- **`tests/support/unit/watch-handle.ts`** — Provides `noopWatchHandle` to neutralise the store's own watch on order updates.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore()` registers enabled modules into the kernel so `collectModuleRoutes` can build the real route tree for the memory router.

## Notes
- `fetchOrder` must be spied on **before** calling `mount`, because `OrderEdit` destructures its store actions at setup time; spying after mount would not intercept the initial re-fetch.
- Reactivity assertions use `nextTick().then(() => nextTick())` (two ticks) to allow the promise-resolve + re-render cycle; a single tick is insufficient.
- The payments mock uses **refs** (`mockCanRefund`, `mockRefundLoading`) rather than static values so individual tests can toggle loading/canRefund state mid-assertion and observe reactive UI updates.
- The bespoke router carries no `access` guard; authorization is faked via the session store only. This is intentional—guard logic is not the concern of this spec.
- `RecordOfflinePaymentForm` is stubbed to a bare `<div>`; mounting the real one would pull in `useRecordOfflinePayment` and an unseeded payments store.
