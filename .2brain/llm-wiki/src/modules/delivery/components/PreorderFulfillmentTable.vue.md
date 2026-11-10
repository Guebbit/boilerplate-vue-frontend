---
source: src/modules/delivery/components/PreorderFulfillmentTable.vue
sha256: b00deb263ebf96045c51691e4fc54d557ab58c0b687eef33756baf1bbefc6f0a
signature: 94aa7e1ff68209b3caa95b0e0264be0c74d7d4b42f2617aad9664b133e275a38
generated_at: 2026-11-10T04:15:17.387265+00:00
model: ollama:qwen3.8:27b
---

# src/modules/delivery/components/PreorderFulfillmentTable.vue

## Purpose

Second tab of the preorder board: renders one row per fulfillment order derived from a preorder, showing buyer, paid/agreed/expected dates, and fulfillment state. Provides three server-driven warning filters (state, "Late", "Due soon") and a product chip that arrives from the adjacent products tab. The component owns no business logic for the warning flags—the server decides which rows are late or due soon; this file only passes the filter parameters and renders the result.

## Key elements

- **Props `productId` / `productLabel`** – optional narrowing from the page; `undefined` means "all products."
- **Emit `clearProduct`** – fired when the user dismisses the product chip.
- **`filters` / `state` / `lateOnly` / `dueSoonOnly`** – a single reactive object (`BoardFilters`) with individual writable computeds so the state select, "Late" toggle, and "Due soon" toggle all compose into one fetch call.
- **`useListUrlState`** – persists `state`, `late`, `dueSoon`, and `page` under the `fulfillment-*` URL prefix so a filtered view is shareable.
- **`load()`** – calls the delivery store's `fetchPreorderBoard` with the current filter values; on failure, toasts via `useNotificationsStore`.
- **`STATE_COLORS`** – maps each `PreorderFulfillmentState` to a `ThemeColor | undefined` using `satisfies`, so a new enum value is a compile-time error.
- **`orderLink` (from `useOrderLink`)** – optionally renders the order number as a router-link when the current build ships an order detail page.
- **`headers`** – eight columns: orderNumber, buyer, lines, paidAt, agreedAt, expectedAt, state, lastNoticeAt.

## Relationships

- **`src/modules/delivery/store.ts`** – primary data source. The component calls the store's fetch method and reads `preorderBoard`, `preorderBoardTotal`, `loading` via `storeToRefs`. All fetch logic lives in the store; this component never talks to the API directly.
- **`src/modules/delivery/index.ts`** – the module barrel that exposes this component (and the store) as part of the delivery module's public surface.
- **`src/modules/delivery/tests/preorder-fulfillment-table.spec.ts`** – dedicated unit test file exercising this component's rendering, filter behaviour, and pagination.
- **`src/infrastructure/utils/logger.ts`** – listed in the dependency graph but not directly imported in the visible source; likely reached transitively through another dependency (e.g. the error-notification utility or the store).

## Notes

- The "Late" and "Due soon" toggles are **not** recomputed client-side. They are server rules (late = expected date passed + units remain; due soon = waiting + expected within `DUE_SOON_DAYS`). The component only sends the boolean flag; the server interprets it.
- `DUE_SOON_DAYS` is a constant (7) but the i18n string interpolates it, so changing the constant changes the label automatically—keep them in sync if you ever move it to a config.
- The `watch` on `[state, lateOnly, dueSoonOnly, productId]` resets `page` to 1 and then re-loads; a separate `watch(page)` handles page-only changes. The guard `if (page.value === 1)` prevents a double `load()` call on the first filter change.
- The component name is declared in a separate options-`<script>` block because `<script setup>` cannot set `name`; this is required for `<KeepAlive>` and devtools identification.
- `ListPagination` is imported but the template is truncated in the visible content; assume it renders below the `DataTable` using `page` and `pageTotal`.
