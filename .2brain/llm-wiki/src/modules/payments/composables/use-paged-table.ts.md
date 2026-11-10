---
source: src/modules/payments/composables/use-paged-table.ts
sha256: 8aa355b37622c6fe374fcc10191c547b23dafc2df0569d0d9f97ab27a19678a0
signature: 322d62ba11b58523b0a92ed733b09e5aa416588d8c2b2fc2d967e91e91fd1307
generated_at: 2026-11-10T05:11:29.962519+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/composables/use-paged-table.ts

## Purpose
Shared paging composable for all staff payments tabs. It centralises the fixed page size, 1-based page tracking, page-count derivation, and the single `load` call (on mount + on page change) so that individual tab components don't each reimplement the same fetch-and-toast-on-error loop.

## Key elements
- **`PAYMENTS_TABLE_PAGE_SIZE`** (const, 10) — the fixed rows-per-page value used by every tab.
- **`PagedTable`** (interface) — the return shape: `page` (1-based `Ref<number>`), `pageTotal` (`Ref<number>`), and `load` (`() => Promise<unknown>`).
- **`usePagedTable(total, fetchPage)`** (composable) — wires a tab's paging to its store read.
  - `total` — reactive row count from the tab's store.
  - `fetchPage(page, pageSize)` — the store method that fetches one page.
  - Returns a `PagedTable` object.
  - Internally uses `useNotificationsStore().addMessage` + `notifyErrorMessages` to toast any fetch failure once, centrally.
  - Calls `load` on `onMounted` and via a `watch` on `page`.

## Relationships
- **`PaymentsTable.vue`, `RefundsTable.vue`, `AwaitingTransfersTable.vue`** — each tab calls `usePagedTable` with its own store total and page-fetcher, then binds the returned `page` / `pageTotal` to its pager and calls `load` imperatively when needed.

## Notes
- `load` **never rethrows**; failures are swallowed after being toasted. Callers can `await load()` safely without a try/catch.
- `page` is **1-based** (starts at 1), matching the expected API convention.
- The `watch` on `page` and the `onMounted` call both fire-and-forget (`void load()`); the floating-promise ESLint rule is explicitly disabled at both sites because `load` handles its own failure.
- The composable is reactive to `total`: if the store's row count changes, `pageTotal` recomputes automatically, but `load` is **not** re-triggered by that change alone—only by a `page` ref change or an explicit call.
