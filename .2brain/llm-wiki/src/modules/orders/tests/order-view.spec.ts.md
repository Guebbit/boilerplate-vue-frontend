---
source: src/modules/orders/tests/order-view.spec.ts
sha256: ba3731cd6a352b524a8a331ed34647c20276075dde11e47ac3c38d3cf9119cba
generated_at: 2026-10-02T15:22:34.579811+00:00
model: ollama:qwen3.8:27b
---

# src/modules/orders/tests/order-view.spec.ts

## Purpose

Vitest spec that mounts the real `Order.vue` detail page (with a memory-history router, Pinia, Vuetify, i18n) and asserts UI behavior around invoice buttons, credit-note listing/download, order-number display, payment-deadline prop passing, and the VAT summary block. It exists to lock down the order-detail view's contract against the catalogue and API layer without hitting a live server.

## Key elements

- **`mountOrder(order)`** – Seeded-mount helper: spies `watchOrder` to return a `noopWatchHandle`, calls `store.addOrder` / sets `selectedOrderId`, then mounts `Order.vue` with stubs for `LayoutDefault`, `PaymentPanel`, `ShipmentPanel`, and `WithdrawalPanel`.
- **`lineWith(current)`** – Builds a single order line with a fixed product and only the `current` field varying, so tests can isolate catalogue-resolution assertions.
- **`BASE_ORDER`** – A fully populated `Omit<OrderType, 'items'>` fixture (status `pending`, all action flags `false`, no `orderNumber`, empty `taxSummary`).
- **`invoicedOrder()`** – Convenience wrapper that flips `actions.invoice` to `true` (the only state that permits credit notes).
- **`signIn(canReadAuditLog)`** – Populates `useSessionStore` with a token, viewer, and optional `audit.any.read` ability to gate the History link.
- **`vi.mock('@api')`** – Partial mock: `reorder` is wrapped via `vi.fn(actual.reorder)` (passthrough unless overridden), while `listOrderCreditNotes` and `getOrderCreditNote` resolve canned values.
- **`vi.mock('@guebbit/js-toolkit')`** – Stubs `downloadBlob` so PDF downloads are observable but never executed.
- **`router`** – `createRouter` with `createMemoryHistory`, routes derived from `collectModuleRoutes(enabledModules)` under a `/:locale` parent.
- **`beforeEach`** – Fresh Pinia, `loadLocale('en')`, and `router.push('/en/orders/o1')`.

## Relationships

- **`tests/support/unit/wire-modules.ts`** – `wireModulesIntoCore()` is called at module scope to register enabled modules into the kernel registry before the router is built.
- **`tests/support/unit/mounted-vm.ts`** – Exports `nextRenderTick`, imported for use (in the truncated remainder) to await Vue's next paint cycle.
- **`tests/support/unit/watch-handle.ts`** – Provides `noopWatchHandle`, the return value of the `watchOrder` spy, preventing the store from starting a real polling/watch loop.
- **`tests/support/stub.ts`** – Exports `asStub`, imported here for casting/stubbing utilities (visible in the import list; used in the truncated portion).
- **`contracts/rest/index.ts`** – The `@api` barrel that this spec partially mocks (`reorder`, `listOrderCreditNotes`, `getOrderCreditNote`); the real implementations back the `vi.fn(actual.…)` passthrough for `reorder`.

## Notes

- `reorder` is intentionally a *passthrough* mock (`vi.fn(actual.reorder)`): it only becomes controllable in the in-flight-guard test. All other tests rely on the store's own mocked reads, not on `reorder`.
- `PaymentPanel`, `ShipmentPanel`, and `WithdrawalPanel` are stubbed to `true` (or a slot-passthrough for `LayoutDefault`) because they fire their own data fetches on mount; the transport for those is not mocked here.
- The file mirrors the structure of `products/tests/product-view.spec.ts` (noted in the module JSDoc) — expect the same mount/lifecycle conventions if you're adding a sibling module's view spec.
- `downloadBlob` is asserted with `expect.any(Blob)` for the payload and an exact filename string — the filename encodes `order-{id}-credit-note-{number}.pdf`.
