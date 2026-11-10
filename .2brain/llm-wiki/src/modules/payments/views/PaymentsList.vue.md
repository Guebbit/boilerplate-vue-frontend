---
source: src/modules/payments/views/PaymentsList.vue
sha256: 368b87eb50c122e04f55140895fb39ac87c20e508fa1e63e6b8bd1ef13c77a42
signature: d0c6ad703478c2cdfce7af06fbd2767d705b8c266365552362929f99ba6bdbc1
generated_at: 2026-11-10T05:18:45.923180+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/views/PaymentsList.vue

## Purpose

The staff-facing payments page. It presents four tabbed views over the same payment data — all payments, bank transfers still owed, refunds, and items needing attention — as saved views rather than separate pages, so a record opened in any tab is the same record the drawer shows in another. It also hosts the order-reference lookup and the shared `PaymentDrawer`.

## Key elements

- **`PaymentsListPage`** — Named component (declared in the non-setup `<script>` block) so devtools and `<KeepAlive>` can identify the SFC alongside `<script setup>`.
- **`PaymentsTab`** (type) — Union `'all' | 'awaiting' | 'refunds' | 'attention'`; the set and display order of tabs.
- **`activeTab`** / **`selectTab(tab)`** — Current tab ref and the switch handler. `selectTab` writes the tab into the URL query (`?tab=`) via `router.replace`, omitting the param when the tab is `'all'` so the default URL stays clean.
- **`initialTab()`** — Reads `route.query.tab` on mount; falls back to `'all'` if the value is not one of the four known tabs.
- **`picked`** / **`drawerOpen`** — State for which payment the `PaymentDrawer` is showing and whether it is open.
- **`openDrawer(payment)`** — Called by `PaymentsTable` and `AwaitingTransfersTable` on row select; sets `picked` and opens the drawer.
- **`reloadKey`** / **`handleChanged(payment?)`** — Counter bumped after the drawer reports a monetary change. Passed as `:key` to every tab-content component so they remount and re-fetch. If the drawer returns an updated `Payment`, `picked` is updated in place before the bump.
- **`handleReferenceFound(orderId)`** — `@found` handler for `OrderReferenceSearch`. Resolves the cross-module `OrderEdit` route by name via `linkIfRouted`; navigates with `routerLinkI18n` when present, resolves a no-op `Promise` when the orders module is not bundled.

## Relationships

- **`PaymentsTable.vue`, `AwaitingTransfersTable.vue`, `RefundsTable.vue`, `AttentionList.vue`** — Rendered inside `v-tabs-window-item` panels. `PaymentsTable` and `AwaitingTransfersTable` emit `@select` (wired to `openDrawer`); `RefundsTable` and `AttentionList` are display-only here. All four receive `:key="reloadKey"` to force a remount after a drawer mutation.
- **`PaymentDrawer.vue`** — Always rendered (not inside a tab panel). Bound via `v-model="drawerOpen"` and `:payment="picked"`; emits `@changed` which feeds `handleChanged`.
- **`OrderReferenceSearch.vue`** — Conditionally rendered above the tabs (gated by a permission check on the viewer). Its `@found` event is handled by `handleReferenceFound`.
- **`payments-list-view.spec.ts`** — Unit/integration tests for this page's rendering and tab behaviour.
- **`payments-list-refused-refund.spec.ts`** — Tests the refused-refund interaction path that flows through this page (drawer → `handleChanged` → remount).

## Notes

- Tab state is URL-driven (`?tab=`), not component-local. A deep link or reload restores the active tab. The `'all'` tab is the implicit default: the query param is omitted for it.
- `selectTab` uses `router.replace` (not `push`) so a tab click does not create a history entry. The floating-promise is acknowledged with an eslint-disable comment because vue-router reports failures through `router.onError`.
- `handleReferenceFound` is deliberately a no-op when the `orders` module is absent from the build. The route is resolved by name string (`'OrderEdit'`), never by a direct import, so the payments bundle stays independent.
- The `:key="reloadKey"` remount pattern is the sole refresh mechanism — there is no shared store or event bus for invalidation. Every tab panel remounts simultaneously, which is the intended (if slightly blunt) strategy.
