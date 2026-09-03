# src/modules/orders/tests/order-edit-view.spec.ts

## Purpose

Verifies that `OrderEdit.vue` gains `actions` (transitions, cancel, pay) after a list-cache arrival triggers `useOrderActionsRefetch`, rather than being left with no available moves. Mounts the real component against a real memory-history router over `collectModuleRoutes`, exercising the forced re-fetch for real instead of pre-seeding the detail row. Follows the same template as `product-view.spec.ts` and `wishlist-view.spec.ts`.

## Key elements

- **`wireModulesIntoCore()`** — called at module scope; wires enabled modules into the kernel registry so `collectModuleRoutes` resolves real routes.
- **`vi.mock('@/modules/payments', …)`** — replaces `useOrderRefund` with a stub returning `canRefund: false` and a no-op `refund`, preventing an unmocked HTTP call and respecting `eslint-plugin-boundaries` sibling-module boundaries.
- **`router`** — `createRouter` with `createMemoryHistory` and a single `/:locale` → `RouterView` wrapper whose children come from `collectModuleRoutes(enabledModules)`.
- **`signInAsAdmin`** — sets `accessToken` and an admin `viewer` on the session store.
- **`anOrder(overrides?)`** — factory returning a minimal `Order` (status `pending`, empty items).
- **`mountFromListCache(detailOrder)`** — the core setup helper. Seeds the orders store with a *summary* row (`actions: undefined`), sets `selectedOrderId`, spies `watchOrder` (returns a noop) and `fetchOrder` (resolves the full detail row with `actions`). Then mounts `OrderEdit` with the real router, Vuetify, i18n, and a `LayoutDefault` stub.
- **`beforeEach`** — fresh Pinia, `loadLocale('en')`, pushes `/en/orders/o1/edit`, awaits `router.isReady()`.
- **`describe('a list-cache arrival gains actions')`** — two cases:
  - *offers every reachable status once the forced re-fetch lands* — asserts the VSelect `items` contain exactly the current status + reachable transitions (not the full enum), and the cancel-only button is enabled.
  - *leaves Cancel disabled once actions.cancel answers false* — asserts both cancel-only and cancel-and-refund buttons carry a `disabled` attribute.

## Relationships

- **`tests/support/unit/wire-modules.ts`** — provides `wireModulesIntoCore`, called once at import time so the shared module registry is populated before `collectModuleRoutes` is invoked for the test router.

## Notes

- The test router has **no navigation guards**, even though the production route for `OrderEdit` declares `access: 'admin'`. Auth is simulated purely by seeding the session store.
- The double `nextTick().then(() => nextTick())` chain is required to let the mocked `fetchOrder` promise resolve *and* for Vue to flush the resulting reactive update before assertions run.
- `watchOrder` is spied to return `noopStopHandle` (typed as `WatchStopHandle`) so the component's `onMounted` watcher lifecycle doesn't create a real watcher that would interfere with the test's controlled `fetchOrder` call.
- The `@/modules/payments` mock is necessary both to avoid a real HTTP request and to satisfy `eslint-plugin-boundaries`, which forbids a test in the `orders` module from importing a store directly from the `payments` sibling.
