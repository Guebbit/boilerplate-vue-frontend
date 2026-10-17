---
source: src/modules/payments/views/PaymentsList.vue
sha256: 601c4e83ee66ead1fe78346363d97e4381f0766d5e23c1d60cc609b442501140
generated_at: 2026-10-17T01:26:49.326952+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/views/PaymentsList.vue

## Purpose

The staff-facing payments page. It presents four tabs (All, Awaiting transfer, Refunds, Attention) over the same backend records so a payment can be inspected from any tab. It owns tab state, the shared `PaymentDrawer`, and the optional order-reference lookup; each tab's body is delegated to a dedicated component.

## Key elements

- **`PaymentsTab` type** — union of the four tab identifiers: `'all' | 'awaiting' | 'refunds' | 'attention'`.
- **`tabs` (computed)** — the list of tabs available in *this* build. "Awaiting transfer" appears only when the slot `payments-awaiting-transfer` is populated (i.e., the orders module contributed a component).
- **`activeTab` / `selectTab`** — current tab, persisted in `?tab=`. `selectTab` uses `router.replace` so a tab click doesn't add a history entry; the `'all'` tab is the default and is omitted from the query string.
- **`initialTab()`** — reads `route.query.tab`, falls back to `'all'` if the requested tab isn't in the current build's `tabs`.
- **`openDrawer` / `picked` / `drawerOpen`** — state for the shared `PaymentDrawer`; any tab can open it for a given `Payment`.
- **`reloadKey`** — a numeric ref incremented when the drawer emits `@changed`; bound as `:key` on `PaymentsTable`, `RefundsTable`, and `AttentionList` to force a full remount and re-fetch.
- **`handleReferenceFound`** — `OrderReferenceSearch`'s `@found` handler. Resolves the `OrderEdit` route **by name** via `linkIfRouted`; navigates only if that route exists in the build (the payments module never imports an order route directly).
- **`awaitingContributions`** — obtained from `useSlot('payments-awaiting-transfer')`; each entry is rendered as a dynamic `<component :is>` inside the Awaiting tab.

## Relationships

- **PaymentsTable** — rendered in the *All* tab; emits `@select` to open the drawer.
- **RefundsTable** — rendered in the *Refunds* tab; receives `:key="reloadKey"` for remount.
- **AttentionList** — rendered in the *Attention* tab; receives `:key="reloadKey"` for remount.
- **PaymentDrawer** — rendered once at page level (not inside a tab); controlled by `v-model` on `drawerOpen`, receives the selected `Payment`, and emits `@changed` to bump `reloadKey`.
- **OrderReferenceSearch** — conditionally rendered at the top of the page when `session.can('create', 'Payment')`; emits `@found` with an `Order`.
- **payments-list-view.spec.ts** — unit/integration tests for this view.

## Notes

- **Slot-based "Awaiting" tab:** This module has zero imports of the orders module. The tab body is entirely supplied by whatever registers into the `payments-awaiting-transfer` slot. If no slot contributor exists, the tab is absent and any `?tab=awaiting` URL silently falls back to `all`.
- **Route-by-name navigation:** `handleReferenceFound` deliberately avoids importing an order route. If the orders module is absent from the build, the lookup simply resolves without navigating — a graceful degradation, not an error.
- **Tab state in URL, not in a store:** The active tab is the single source of truth in `route.query.tab`. There is no Vuex/Pinia entry for it; a deep-link or browser reload restores the tab.
- **`reloadKey` as remount lever:** Rather than calling a refetch method on each table, the page increments a key to destroy and recreate the component. Any new tab component added should also accept `:key="reloadKey"` to participate.
- **Named component block:** The separate `<script>` block exists solely to set `name: 'PaymentsListPage'` for `<KeepAlive>` / devtools; `<script setup>` cannot declare a name itself.
