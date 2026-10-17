---
source: src/modules/locales/views/LocalesDictionary.vue
sha256: 7b8b28c0fac92b179cc24b725df7e9f4e2b9d23668ddd8933ca4322fa6cd1956
generated_at: 2026-10-17T01:07:38.602697+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesDictionary.vue

## Purpose

Route view for the locales dictionary board: a client-side paginated, debounced-filtered table showing every i18n key down the rows and every language across the columns. The file owns only the filtering, pagination, "add key" flow, and "create language" flow — the three-source read model and all per-cell writes are delegated to dedicated composables.

## Key elements

- **`LocalesDictionaryPage`** (named component, plain `<script>` block) — provides a stable `name` for devtools and `<KeepAlive>`, required because `<script setup>` cannot declare one.
- **`filteredKeys`** (computed) — applies the text needle against key names and cell values, plus the `incompleteOnly` toggle (keys missing in ≥ 1 language).
- **`pageRows` / `pageTotal` / `pageCurrent`** — client-side pagination over `filteredKeys` at a fixed `PAGE_SIZE = 25`.
- **`applyFilter` / `applyFilterSoon`** — debounced (250 ms, lodash-es trailing-edge) filter commit; `applyFilterSoon` is cancelled on unmount and on explicit search submit.
- **`handleSearch`** — applies the filter immediately and cancels any pending debounce so the queued call doesn't double-apply.
- **`handleAddKey`** — inserts a pending key via `addPendingKey`, clears filters, cancels the in-flight debounce, jumps to the new row's page, and focuses its input on `nextTick`.
- **`handleCreateLanguage`** — calls `localesStore.createLanguage`, loads the new language's column, and routes errors to `LanguageFormDialog.applyServerErrors` (field-level) or `useBlockingError` (dialog-blocking).
- **`tableHeaders`** (computed) — one key column plus one `synthetic: true` column per active language.
- **`incompleteOnly`** (ref) — toggle to isolate keys that are missing in at least one language.

## Relationships

- **`useDictionaryAggregation`** (composable) — supplies the entire read model consumed by this view: `allKeys`, `languages`, `entryAt`, `baselineAt`, `isMissing`, `cellState`, `addPendingKey`, `loadLanguage`, `afterWrite`, and the `app` switch.
- **`useDictionaryCellEditor`** (composable) — receives `app`, `entryAt`, `baselineAt`, `afterWrite`; provides the per-cell editing surface (`drafts`, `handleCellInput`, `handleCellBlur`, `handleCellEnter`, `handleCellClear`, `boardElement`) that the DataTable's cell slots bind to.
- **`store.ts`** (Pinia store) — reads `ownApp` as the initial `app` value; calls the `createLanguage` action on dialog submit.
- **`LanguageFormDialog`** — rendered as the create-language dialog; its exposed `applyServerErrors` maps a failed save back onto the dialog's fields, keeping it open for correction.

## Notes

- Two `<script>` blocks are intentional: the first (plain) sets the component `name`; the second (`<script setup>`) holds all logic. Omitting the first would lose the stable name in devtools and `<KeepAlive>`.
- **Debounce lifecycle is fragile by design.** `handleAddKey` must call `applyFilterSoon.cancel()` *before* recomputing `pageCurrent`, because clearing `filterText` schedules a debounced apply that would reset the page 250 ms later and scroll the new row out of view.
- A "key" has no server-side record. Keys exist only as the shared `key` string on entries; adding a key here is purely a pending, in-memory row until a cell is filled.
- Cell state is tri-state: **ENTRY** (stored override), **BASELINE** (bundled or deployed text, read-only), **MISSING** (neither). This view never writes baselines — those come from file deploys.
- The file is truncated in this snapshot; a tail section (likely the `<template>` block and any remaining watchers for `app` switching) is not shown.
