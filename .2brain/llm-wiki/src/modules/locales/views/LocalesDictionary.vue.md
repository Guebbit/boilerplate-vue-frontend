---
source: src/modules/locales/views/LocalesDictionary.vue
sha256: 164f43464100cde5f08242e1177e712987bedb2cda9fc7c3602b535fb4ca5dc6
generated_at: 2026-10-02T15:17:27.575389+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesDictionary.vue

## Purpose

Route view (`LocalesDictionaryPage`) that renders the full dictionary board: every i18n key as a row, every language as a column. It owns client-side text filtering, pagination, and the "add key" / "create language" flows, delegating the three-source data model (entries, API baseline, bundled baseline) to `useDictionaryAggregation` and per-cell editing to `useDictionaryCellEditor`.

## Key elements

- **`filteredKeys`** (computed) — filters `allKeys` by the applied text (matches key name or any cell value) and by the `incompleteOnly` toggle.
- **`pageRows` / `pageTotal` / `PAGE_SIZE`** (25) — client-side pagination over `filteredKeys`; no server round-trip.
- **`applyFilter` / `applyFilterSoon`** — immediate vs. debounced (lodash-es `debounce`, 250 ms trailing) application of `filterText` → `appliedFilter`; resets to page 1.
- **`handleSearch`** — form-submit handler that cancels any pending debounce and applies immediately.
- **`handleAddKey`** — validates the key is non-empty and unique, calls `addPendingKey`, cancels the debounce, jumps to the new row's page, and focuses its cell input via `nextTick` + `querySelector`.
- **`handleCreateLanguage`** — calls `localesStore.createLanguage`, then `loadLanguage(tag)`; on failure routes server errors to the `LanguageFormDialog` or falls back to `useBlockingError`.
- **`tableHeaders`** (computed) — builds a key column plus one synthetic column per language for the `DataTable`.
- **`useDictionaryAggregation(tenant)`** — provides `allKeys`, `entryAt`, `baselineAt`, `isMissing`, `cellState`, `loadBoard`, `addPendingKey`, etc.
- **`useDictionaryCellEditor(tenant, entryAt, baselineAt, afterWrite)`** — provides `drafts`, `boardElement`, `handleCellInput/Blur/Enter/Clear`, `cellId`, `cellLabel`.
- **`useBlockingError`** — local blocking-error state for the create-language dialog.
- **`useNotificationsStore`** (`addMessage`) — toast feedback for every user-visible outcome.
- **`useLocalesStore`** — tenant info and `createLanguage` action.
- **Template deps** — `DataTable`, `ListPagination`, `LanguageFormDialog`, `InlineErrorAlert`, lucide icons.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — dependency-graph neighbor (listed in the project's import/usage graph). Exact usage falls in the truncated portion of this file; no direct import is visible in the available source.

## Notes

- **Debounce cancellation is load-bearing.** `applyFilterSoon` is cancelled in three places: on unmount, before `handleSearch` applies, and before `handleAddKey` computes a new page. Forgetting any one causes a stale 250 ms callback to reset `pageCurrent` or double-apply the filter.
- **`filterText` and `appliedFilter` are deliberately separate refs.** The raw keystroke ref drives the input; the applied ref drives the expensive board re-render. Merging them re-introduces per-keystroke jank.
- **No server pagination or filtering.** The board is a few hundred rows at most; all slicing happens in the browser.
- **Baselines are read-only.** Cells display bundled/API text as placeholders; only entries (stored overrides) are writable. Files are a deploy artifact, not a form.
- **`CSS.escape` is used** when querying the newly-added row's input, because i18n keys can contain characters that break a raw `querySelector` selector.
