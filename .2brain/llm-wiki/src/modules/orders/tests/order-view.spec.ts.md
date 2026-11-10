---
source: src/modules/orders/tests/order-view.spec.ts
sha256: b865c6fdf70d4ded22868ae9bc3123935d77473acb389761a2a22488842f6d63
signature: 8987ea455c34526153e66ed1992fcf0a466691c638bb7207a313be077bb6c50c
generated_at: 2026-11-10T05:03:28.479055+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-view.spec.ts

## Purpose

Component test for the order detail page (`OrderTarget.vue`). Mounts the real component against a real memory-history router and verifies behaviours scoped to this page: line-item pictures resolved live from `item.current` (never a frozen `item.product.imageUrl`), invoice button visibility/gating, credit-note listing and download, order-number display, timeline mounting and its `refreshKey`, and the reorder in-flight guard. The store's own `watchOrder` fetch is stubbed so the order is seeded directly into the dictionary.

## Key elements

- **`vi.mock('@api', …)`** — Partially mocks the API contract: `reorder` is wrapped as `vi.fn(actual.reorder)` (calls through unless a test overrides); `listOrderCreditNotes` resolves `{ items: [] }`; `getOrderCreditNote` resolves a synthetic `File`.
- **`vi.mock('@guebbit/js-toolkit', …)`** — Replaces `downloadBlob` with a no-op spy.
- **`wireModulesIntoCore()`** — Registers enabled modules into the kernel so `collectModuleRoutes` can build the real route table.
- **`router`** — `createMemoryHistory` router with the production route shape (`/:locale` → `RouterView` → module children).
- **`mountOrder(order)`** — Seeds the order into `useOrdersStore` (spies `watchOrder` → `noopWatchHandle`, calls `addOrder`, sets `selectedOrderId`), then mounts `OrderTarget` with `id` prop, real plugins (router, vuetify, i18n), and stubs for `PaymentPanel`, `ShipmentPanel`, `WithdrawalPanel`, `OrderTimeline`.
- **`lineWith(current?)`** — Factory for a single order line; only `current` varies between assertions.
- **`BASE_ORDER`** — Shared order fixture (all `actions` flags false except where a test overrides).
- **`invoicedOrder()`** — Convenience: `BASE_ORDER` with `actions.invoice = true`.
- **`signInAsShopper()`** — Sets `accessToken` and `viewer` on the session store so the page treats the session as authenticated.
- **Test blocks** — `describe` groups: "the invoice buttons", "the credit notes", "the order number", "the timeline", "the payment deadline" (and, per the header comment, the line-picture and reorder-guard cases).

## Relationships

- **`src/modules/orders/views/OrderTarget.vue`** — The component under test; mounted directly with its `id` prop.
- **`src/modules/orders/store.ts`** — `useOrdersStore` is the data source; `watchOrder` is spied to suppress the real fetch, `addOrder` / `selectedOrderId` are set imperatively, and `fetchOrder` is mocked in the shipment-panel "moved" test.
- **`contracts/rest/index.ts`** (`@api`) — The HTTP API surface; partially mocked as described above.
- **`tests/support/unit/wire-modules.ts`** — `wireModulesIntoCore` registers module metadata so the router can collect real routes.
- **`tests/support/unit/watch-handle.ts`** — Provides `noopWatchHandle` used to replace the store's `watchOrder` subscription.
- **`tests/support/unit/mounted-vm.ts`** — Provides `nextRenderTick` for deterministic render-timing in async tests.
- **`tests/support/stub.ts`** — Exports `asStub`, imported for use in the (truncated) portion of the file.

## Notes

- `reorder` is intentionally *not* stubbed for most tests — it calls the real implementation. Only the in-flight-guard test overrides it with a never-resolving promise, because the CART store's `loading` flag is real TanStack-tracked state that only an actual pending request can set.
- The router is the production route tree, not a simplified fixture; tests rely on `router.isReady()` in `beforeEach` before asserting DOM.
- `OrderTimeline` is stubbed out via `stubs` for most tests but is accessed via `getComponent` in the timeline-specific tests (the stub is transparent to `getComponent` when no replacement component is provided).
- `refreshKey` on `OrderTimeline` is a pipe-delimited concatenation of four status fields (`status|paymentStatus|fulfillmentStatus|returnStatus`); a change in any one must alter the key or the timeline's internal history goes stale.
- The test file uses `wrapper.unmount()` at the end of every `it` block as a convention to avoid cross-test leakage of watchers or subscriptions.
