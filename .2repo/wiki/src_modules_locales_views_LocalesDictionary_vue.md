# src/modules/locales/views/LocalesDictionary.vue

## Purpose
Route view that renders the full i18n dictionary board — every key down the left, every language across the top — with client-side text filtering, pagination, and an "add key" flow. It owns only the presentation-layer concerns (filter, paging, add-key navigation); all three-source data aggregation and per-cell writes are delegated to composables.

## Key elements
- **`filteredKeys` (computed)** — Applies the debounced text filter (matches key name or any cell's entry/baseline value) and the "incomplete only" toggle against `allKeys`.
- **`pageRows` / `pageTotal` (computed)** — Slices `filteredKeys` at `PAGE_SIZE = 25` for the current page.
- **`tableHeaders` (computed)** — Builds the `CoreDataTableHeader[]`: one key column plus one synthetic column per language.
- **`applyFilterSoon`** — `lodash-es` debounced (250 ms, trailing-edge) wrapper around `applyFilter`; driven by a `watch` on `filterText`.
- **`handleSearch`** — Cancels the pending debounce and applies the filter immediately (form submit path).
- **`handleAddKey`** — Validates, calls `addPendingKey`, resets filters, jumps to the page containing the new row, and focuses its input via `nextTick` + DOM query.
- **`handleCreateLanguage`** — Calls `localesStore.createLanguage`, then `loadLanguage` to populate the new column.
- **`watch(tenant)`** — Resets page, clears drafts, and calls `resetPendingKeys` on tenant switch.
- **`onBeforeUnmount`** — Cancels any in-flight debounced `applyFilter`.

## Relationships
- **`useDictionaryAggregation`** (composable) — Provides `allKeys`, `entryAt`, `baselineAt`, `isMissing`, `cellState`, `loadBoard`, `addPendingKey`, `afterWrite`, etc. The board reads everything through this composable.
- **`useDictionaryCellEditor`** (composable) — Provides `drafts`, `savedCells`, `cellErrors`, `handleCellBlur/Enter/Input/Clear`, `boardElement`. All per-cell edit logic lives here.
- **`useLocalesStore`** — Supplies `ownTenant` (initial tenant ref) and `createLanguage` (used by `handleCreateLanguage`).
- **`LanguageFormDialog`** — Modal for the "create language" flow; emits fields consumed by `handleCreateLanguage`.
- **`DataTable` / `ListPagination`** — Presentation components that render the board grid and pager.
- **`notifyErrorMessages`** (`@/infrastructure/utils/errors.ts`) — Formats API errors into notification toasts on `handleCreateLanguage` rejection.

## Notes
- **Two-ref filter pattern:** `filterText` (bound to the input) and `appliedFilter` (bound to the board) are intentionally separate. The 250 ms gap prevents a full board re-render per keystroke; the board reads only `appliedFilter`.
- **Debounce cancellation is load-bearing in three places:** `onBeforeUnmount`, `handleSearch`, and `handleAddKey`. Forgetting any one of them causes a stale `applyFilter` to fire after the current state has already changed (e.g., the new-key page jump would be undone 250 ms later).
- **No server pagination:** The entire key set for a tenant is loaded client-side (`loadBoard` / `loadLanguage`), then sliced in memory. There is no matrix endpoint.
- **Adding a key writes nothing:** `addPendingKey` only inserts a local row. The key becomes real (and visible to the API) only when a cell is saved via `useDictionaryCellEditor`.
- **Cell states are mutually exclusive per cell:** ENTRY (stored override) → BASELINE (bundled/deployed text) → MISSING. The "incomplete only" toggle and the header count both key off `isMissing`.
