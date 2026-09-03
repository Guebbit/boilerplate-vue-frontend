# src/modules/locales/views/LocaleEntries.vue

## Purpose

Route view for `/locales/:tag` that renders a single language's translation entries in a paginated, searchable table. It drives the locales store's `watchSearchEntries` toolkit, supports inline value editing on blur, add/delete/import/export operations, and after every successful write refreshes the running app's in-memory dictionary so the edit is immediately visible without a reload.

## Key elements

- **`tag`** (computed) — Reads `:tag` from the route; every store call and the live-override refresh is scoped to this language.
- **`capability`** (computed) — The manifest row for the current tag, used for the page header (name, direction, entry count, revision).
- **`tenantChoice`** (computed getter/setter) — Bridges the Vuetify select model to the store filter; maps an `''` sentinel to `undefined` so the API receives "no tenant filter."
- **`pageItems`** (computed) — Filters the toolkit's sparse pagination array (contains `undefined` holes) down to `LocaleEntry` rows.
- **`handleValueBlur(entry)`** — Inline edit: compares the row's local draft against its stored value, calls `editEntry` only on a real change, then flashes a per-row check mark (1.5 s) instead of a toast.
- **`handleAdd` / `handleDelete` / `handleImport`** — CRUD and batch operations; each closes its dialog, fires a success toast, re-runs `search(true)`, and calls `applyLiveOverrides()`.
- **`applyLiveOverrides()`** — Fetches the language's overrides and calls `updateLocale` (the same merge path used at boot). Swallows its own rejection so a live-refresh failure never turns a saved edit into an error toast.
- **`handleExport()`** — Calls `fetchAllEntries` (every tenant, all pages), expands flat rows into a nested dictionary via `expandEntries`, and triggers a `downloadBlob` of pretty-printed JSON.
- **`tableHeaders`** (computed) — Localized `CoreDataTableHeader[]` for the `DataTable`; includes a synthetic `actions` column that renders via slot.
- **`savedRows`** / **`drafts`** — Ephemeral per-row UI state: drafts let blur distinguish "changed" from "clicked through"; `savedRows` drives the transient check-icon feedback.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — Indirect dependency: every error path in this view funnels through `notifyErrorMessages` (from `@/infrastructure/utils/errors.ts`), which in turn uses the shared logger to emit structured error records. The view itself never imports the logger directly.

## Notes

- **Keys are non-editable.** The table intentionally disables the key column: a key *is* the entry's identity, and the API treats a key change as delete + insert. Editing a key in the UI would silently destroy the old row.
- **Tenant sentinel must be `''`, not `undefined`.** Vuetify interprets an item with no `value` as "use the title as the value," which would have sent the display label to the API. The code comments call this out explicitly.
- **Live-override refresh is best-effort.** `applyLiveOverrides` catches its own rejection and resolves to `undefined`. A failed refresh must never surface as an error toast because the write itself already succeeded.
- **Import "merge" mode invariant.** If the API reports a non-zero `removed` count on a merge, the view fires an additional error toast (`error-merge-removed`) rather than silently accepting the anomaly.
- **Export reads entries, not messages.** The messages endpoint is `app`-scoped and invisible for inactive languages; export uses the entries collection to guarantee all stored data is included regardless of activation state.
- **`filters.value.tag` is set synchronously before `watchSearchEntries` is called** so the first search already carries the correct language; the `watch` on `tag` handles subsequent route-parameter changes (reset page, clear drafts, re-search).
