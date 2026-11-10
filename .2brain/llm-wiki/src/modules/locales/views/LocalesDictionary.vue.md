---
source: src/modules/locales/views/LocalesDictionary.vue
sha256: 977aae9bd761ac848c7c7cef69712b3f406ada8abd73457d43e9e388c3928738
signature: 977aae9bd761ac848c7c7cef69712b3f406ada8abd73457d43e9e388c3928738
generated_at: 2026-11-10T04:47:14.520173+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesDictionary.vue

## Purpose

Route view that renders the locales dictionary board: a client-side paginated, debounced-filtered grid where rows are i18n keys and columns are languages. It owns only the filtering, pagination, "add key," and "create language" UI flows; the three-source read model (entries, API baseline, bundled baseline) and per-cell write logic are delegated to composables.

## Key elements

- **`LocalesDictionaryPage`** (named component) — stable name for `<KeepAlive>` / devtools; declared in a separate `<script>` block because `<script setup>` cannot set `name`.
- **`filteredKeys`** (computed) — filters `allKeys` by the applied text (matches key or any cell value) and the `incompleteOnly` toggle (only keys missing in ≥ 1 language).
- **`pageRows` / `pageTotal`** (computed) — slices `filteredKeys` at `PAGE_SIZE` 25 for the current page.
- **`tableHeaders`** (computed) — builds `CoreDataTableHeader[]`: one pinned key column (`KEY_COLUMN_WIDTH = '12rem'`) plus one synthetic column per language.
- **`applyFilter` / `applyFilterSoon` / `handleSearch`** — debounced (250 ms, lodash-es) filter apply; `handleSearch` cancels the pending debounce before applying immediately to avoid a double-fire.
- **`handleAddKey`** — validates the key is non-empty and unique, calls `addPendingKey`, clears filters, and resets the incomplete toggle.
- **`cellFieldProps(tag, key)`** — maps a cell's state (`entry` | `baseline` | `missing`) to Vuetify `v-field` props (variant, baseColor, clearable) plus a state-specific icon so state is not conveyed by colour alone.
- **`BASELINE_PLACEHOLDER_CLASS`** — overrides Vuetify's default disabled opacity (0.38, below AA) with the theme's medium-emphasis opacity so baseline text remains legible.
- **`languageFormOpen` / `languageDialog`** — controls the `LanguageFormDialog` and references its `applyServerErrors` for field-level save errors.
- **`useBlockingError()`** instance — surfaces a save-failure message on the language dialog while it stays open; cleared when the dialog reopens.

## Relationships

- **`src/modules/locales/store.ts`** (`useLocalesStore`) — reads `ownApp` as the default app selection; the store is held whole so its actions are also available.
- **`src/modules/locales/composables/use-dictionary-aggregation.ts`** — provides the entire read model: `allKeys`, `languages`, `entryAt`, `baselineAt`, `isMissing`, `cellState`, `loadBoard`, `afterWrite`, `addPendingKey`, etc.
- **`src/modules/locales/composables/use-dictionary-cell-editor.ts`** — provides `drafts`, `savedCells`, `cellErrors`, and all `handleCell*` / `handleBoardFocusin` handlers wired into the board's cells.
- **`src/modules/locales/components/LanguageFormDialog.vue`** — rendered when `languageFormOpen` is true; the page holds a template ref to call `applyServerErrors` on save failures and manages the dialog's blocked-error state via `useBlockingError`.

## Notes

- **Two-ref filter pattern:** `filterText` is the raw input; `appliedFilter` is the debounced value the board actually reads. This keeps per-keystroke redraws (which walk every key × every language cell) off the hot path. The Search button still applies instantly.
- **Debounce lifecycle:** `applyFilterSoon` is cancelled on `onBeforeUnmount` and explicitly cancelled inside `handleSearch` and `handleAddKey` to prevent a stale queued apply from overwriting the just-set state (notably `pageCurrent`).
- **Cell state is tri-valued, not boolean:** `entry` (stored override), `baseline` (bundled/deployed text, shown as a marked placeholder), `missing` (neither). The header's missing-count and the `incompleteOnly` toggle both derive from this.
- **No server pagination:** the board pages client-side because a language's key set is at most a few hundred rows and the contract has no matrix endpoint.
- **`KEY_COLUMN_WIDTH` is fixed** (width = minWidth = maxWidth) so the pinned column never flexes and the board's focus-correction logic knows exactly how much of the left edge it covers.
