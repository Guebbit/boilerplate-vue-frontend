# src/modules/locales/views/LocalesDictionary.vue

## Purpose

Route view that renders a client-side paginated, debounced-filtered "dictionary board" — one row per i18n key, one column per language. It owns only the presentation layer concerns (filtering, paging, the add-key flow) and delegates all three-source reading to `useDictionaryAggregation` and all per-cell writes to `useDictionaryCellEditor`.

## Key elements

- **`LocalesDictionaryPage`** (default export) — the Vue SFC; component name registered for devtools.
- **`filteredKeys`** (computed) — applies the text needle across key names *and* cell values, plus the `incompleteOnly` toggle, to produce the visible key list.
- **`pageRows` / `pageTotal`** (computed) — slice `filteredKeys` into a window of `PAGE_SIZE` (25) rows for the `DataTable`.
- **`tableHeaders`** (computed) — builds the column array: one real `key` column plus one synthetic column per language tag.
- **`applyFilter` / `applyFilterSoon`** — debounced (250 ms, lodash-es trailing edge) filter application; `handleSearch` cancels the pending debounce and applies immediately on form submit.
- **`handleAddKey`** — adds a pending key via `addPendingKey`, resets filters, computes the target page, and focuses the new row's input on `nextTick`.
- **`handleCreateLanguage`** — calls `localesStore.createLanguage`, then `loadLanguage` to populate the new column.
- **Tenant switch watcher** — resets page, clears drafts, and discards pending keys when `tenant` changes.
- **`onMounted` → `loadBoard()`** — initial data fetch.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — appears in the dependency graph as a neighbor, most likely consumed transitively through the error/notification utilities (`notifyErrorMessages`, `useNotificationsStore`) used for surfacing failures on cell writes and language creation. No direct import is visible in this file.
- **`useDictionaryAggregation`** — supplies the full read model (`allKeys`, `entryAt`, `baselineAt`, `isMissing`, `cellState`, `loadBoard`, `loadLanguage`, `afterWrite`, `addPendingKey`, `resetPendingKeys`).
- **`useDictionaryCellEditor`** — supplies the write model (`drafts`, `cellErrors`, `handleCellBlur/Enter/Input/Clear`, `boardElement`, `cellId`, `cellLabel`).
- **`useLocalesStore`** — provides `ownTenant` (default tenant) and `createLanguage`.
- **`LanguageFormDialog`** — dialog for creating a new language; emits the field object consumed by `handleCreateLanguage`.
- **`DataTable`** — renders the board rows/columns; receives `tableHeaders` and `pageRows`.
- **`ListPagination`** — paged navigation bound to `pageCurrent` / `pageTotal`.

## Notes

- The debounce (250 ms) is deliberate: the board is expensive to redraw (every key × every language × one input per cell), so filtering on raw keystrokes would stutter. The Search button still applies instantly for users who prefer it.
- `handleAddKey` cancels the in-flight debounce *after* clearing `filterText` (which would otherwise schedule a new debounced call that resets `pageCurrent` 250 ms later, undoing the page the function just set).
- Adding a key writes **nothing** to the server; a "key" only exists once a cell entry is saved. `addPendingKey` tracks it locally until then.
- A cell is one of three visual states: ENTRY (stored override), BASELINE (bundled/deployed text), or MISSING. The header badge counts missing cells per language; the "incomplete only" toggle isolates them.
- The component cancels the pending debounce on `onBeforeUnmount` to avoid a stale `applyFilter` call after the component is destroyed.
