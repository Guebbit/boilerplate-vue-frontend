---
source: src/modules/locales/views/LocaleEntries.vue
sha256: 74056ed76272a1f752ae5462f9bf7842ed17864e468186b3ef06bd9020da72b3
signature: 74056ed76272a1f752ae5462f9bf7842ed17864e468186b3ef06bd9020da72b3
generated_at: 2026-11-10T04:46:41.338329+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocaleEntries.vue

## Purpose

Route view for `/locales/:tag` that lists, searches, and edits the translation entries of a single language. It wires the locales store's paginated search to a `DataTable`, provides inline value editing (save-on-blur), an add-entry dialog, an import dialog, and a confirmed delete — and after every successful write it calls `refreshRunningLocale` so the currently-displayed app reflects the edit without a page reload.

## Key elements

- **`LocaleEntriesPage`** — named component block (separate `<script>`), required for `<KeepAlive>` and devtools because `<script setup>` cannot declare a `name`.
- **`tag`** (computed) — reads `:tag` from the route; drives all store calls.
- **`appChoice` / `appFilterOptions`** — app filter select with a `''` sentinel ("every app"); maps `''` ↔ `undefined` between UI and store.
- **`useListUrlState`** (`syncUrl`) — keeps text/app filters and page number in the URL query string.
- **`handleAdd(fields)`** — delegates to `localesStore.addEntry`, then refreshes the list *and* the running locale; on failure calls `entryDialog.applyServerErrors` or falls back to `reportAddError`.
- **`handleValueBlur(entry)`** — saves a single row's value on blur if the draft differs from the stored value; flashes a check-mark via `savedRows` instead of a toast.
- **`handleDelete(entry)`** — wrapped in `singleFlight`; opens a `useDialogStore().confirm`, then calls `localesStore.removeEntry`; failure lands in `rowActionError`.
- **`useBlockingError`** (×3: `addError`, `importError`, `rowActionError`) — inline error slots for dialogs and the table; each is cleared on re-open.
- **`useAmbientError`** — toast-only handler for background reads (`fetchLanguage`, `fetchApps`) that have no inline slot.
- **`tableHeaders`** (computed) — localized `CoreDataTableHeader<LocaleEntry>[]` including a synthetic `actions` column.
- **`refreshRunningLocale(tag)`** — imported from `@/infrastructure/locale-overrides.ts`; called after every successful write.

## Relationships

- **`src/modules/locales/store.ts` (`useLocalesStore`)** — sole data source: `capabilities`, `apps`, `filters`, pagination refs, and all CRUD actions (`addEntry`, `editEntry`, `removeEntry`, `fetchLanguage`, `fetchApps`, `watchSearchEntries`).
- **`src/modules/locales/components/EntryFormDialog.vue`** — opened for add-entry; this page holds a ref to it to call `applyServerErrors` when the API names a specific field.
- **`src/modules/locales/components/EntriesImportDialog.vue`** — opened for batch import; this page supplies its `importError` slot and open/close state.
- **`src/modules/locales/dictionaries.ts`** — imports `expandEntries` (helper for rendering nested dictionary rows) and the `DictionaryRow` type.
- **`src/modules/locales/tests/confirm-once.spec.ts`** — exercises the `singleFlight` guard on `handleDelete` (double-click / rapid-fire confirmation).
- **`src/modules/locales/tests/locale-entries-url.spec.ts`** — verifies that filter/page state is correctly synced to and restored from the URL via `useListUrlState`.

## Notes

- The tag is written **into** `filters.value.tag` (not kept separately) so the store's search-cache key includes it; the `watch(tag)` handler resets page to 1 and clears drafts.
- `appFilterOptions` uses a real empty string `''` as the "all" value, **not** `undefined` — Vuetify interprets a missing `value` as "use the title", which previously caused the label text to be sent to the API.
- Inline row edits use a local `drafts` map keyed by row id so a blur can distinguish "user typed something" from "user just clicked away".
- Delete is wrapped in `singleFlight` (from `@/infrastructure/utils/single-flight.ts`) to prevent a double-confirm from firing two removals.
- The component depends on `@guebbit/vue-toolkit` for `useNotificationsStore` and `@guebbit/js-toolkit` for `downloadBlob` (export path).
