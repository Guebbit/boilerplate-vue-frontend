---
source: src/modules/returns/views/ReturnTarget.vue
sha256: 1ae1052a90f512635e08e8ef311dd0586dfcf75f6ef8bb2ff799398190cec10b
signature: 265a408d5f1ce16fd1083f4ece0f264ebb98929dca327055ec81f053ed605f60
generated_at: 2026-11-10T05:41:38.340240+00:00
model: ollama:qwen3.8:27b
---

# src/modules/returns/views/ReturnTarget.vue

## Purpose

Detail page for a single return record. Renders the return's reason, status, postage responsibility, dates, line items, remedy/decline info, and — for staff — policy exceptions and available actions. Exists as the "one return" view in the returns module, reached via a route parameter (`id`).

## Key elements

- **`ReturnTargetPage`** (named export) — stable component name for devtools and `<KeepAlive>`; required because `<script setup>` cannot declare a `name` itself.
- **`watchReturn(() => id, { onError })`** — subscribes to the route `id`; selects and fetches the matching return in the store whenever the id changes.
- **`refresh()`** — calls `fetchReturn(id, { forced: true })`, bypassing the cache. Triggered on mount (to guarantee `actions` is present for list-seeded rows) and after any staff action mutation.
- **`orderTo`** (computed) — resolves the linked order page via `useOrderLink()`; renders a "View order" button when present.
- **`onMissingRecord`** — on 404/403, redirects to the shared Error page instead of leaving the component in a placeholder state.
- **Template** — `ItemDetailLayout` → `ItemDetailHero` (reason, note, id) → `CardDetail` (status chip, postage, created/stated dates, opened-by, policy-exception chips, preferred/final remedy, received date, refund/deduction amounts, decline reason/message, line-item list) → actions slot.

## Relationships

- **`src/modules/returns/store.ts` (`useReturnsStore`)** — single source of truth. The view destructures `watchReturn`, `fetchReturn`, and the reactive `currentReturn` via `storeToRefs`. All reads and mutations flow through this store.
- **`src/modules/returns/components/ReturnStaffActions.vue`** — rendered in the `#actions` slot when a return is loaded. Receives the `currentReturn` object as `:item` and emits `changed`, which the parent catches to call `refresh()`.

## Notes

- **Cache-priming quirk:** the returns list seeds the Pinia cache with rows that lack the `actions` array. Because of this, `onMounted(refresh)` performs one forced fetch to guarantee the detail view always has full data, even if the user navigated from the list.
- **Money is decimal-string based:** `compareDecimals` and `multiplyDecimal` (from `@/infrastructure/utils/money.ts`) operate on decimal strings, not JS numbers. Do not replace with native arithmetic.
- **`id` prop is optional:** the component tolerates a missing route param (`id?: string`); `refresh()` short-circuits to `Promise.resolve()` when `id` is falsy.
- **Staff-gated fields:** policy exceptions and "opened by staff" are visible only when `session.can('read', 'Return')` is true and the respective data is present on the record.
- **Component name vs. file name:** the registered name is `ReturnTargetPage`, not `ReturnTarget`.
