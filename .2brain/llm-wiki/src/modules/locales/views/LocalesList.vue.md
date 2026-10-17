---
source: src/modules/locales/views/LocalesList.vue
sha256: 8f44cd98e7ddf854ad0a900832743621fcd3769186358b50dc83446aa3943840
generated_at: 2026-10-17T01:07:55.518653+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesList.vue

## Purpose

The admin-facing languages board: a thin CRUD view over the locales manifest that lists every `LocaleCapability` row (both tiers), lets the admin create, edit, activate/deactivate, and delete languages, and links out to the dictionary reader view.

## Key elements

- **`tableHeaders`** (computed) — Column definitions for the `DataTable`; the last column (`actions`, `synthetic: true`) is rendered via a scoped slot rather than a row field.
- **`openCreate` / `openEdit`** — Set `editing` (absent = create) and flip `formOpen` to open `LanguageFormDialog`.
- **`handleSave(fields)`** — Routes to `localesStore.createLanguage` or `editLanguage`. On rejection, first tries the dialog's `applyServerErrors` (field-level, e.g. duplicate tag); unmapped errors fall through to the dialog-level `useBlockingError` alert.
- **`handleDelete(language)`** — Opens a `useDialogStore().confirm` dialog (names the tag and entry count), then delegates to `deactivateThenDelete` which sequences deactivate → delete → reactivate-on-failure. Failures surface in a board-level `InlineErrorAlert` above the table.
- **`appKind(id)`** — Resolves an app id to its `kind` for chip colouring; defaults to `'frontend'` until the apps registry has loaded.
- **`rowActionSize`** — From `useTouchFriendlySize`; `small` on desktop, larger default below `sm` to meet WCAG touch-target size.
- **Dual `useBlockingError` instances** — One scoped to the dialog (save failures keep the dialog open), one scoped to the board (delete failures show an alert above the table while the board remains interactive).

## Relationships

- **`src/modules/locales/store.ts`** — Primary data source. Reads reactive refs (`capabilities`, `apps`, `defaultLocale`, `fallbackLocale`, `loading`) via `storeToRefs`; calls `fetchLanguages` / `fetchApps` on mount, and `createLanguage` / `editLanguage` / `removeLanguage` for all writes.
- **`src/modules/locales/components/LanguageFormDialog.vue`** — Rendered inline; controlled by `formOpen` and `editing`. Receives `handleSave` as the submit handler; the page calls back into its `applyServerErrors` ref to map field-level server errors onto form inputs.
- **`src/modules/locales/domain/deactivate-then-delete.ts`** — Called inside `handleDelete` to sequence the three-step deactivate → delete → (rollback) reactivate flow, passing the store's `editLanguage` and `removeLanguage` as the individual operation callbacks.

## Notes

- Two `<script>` blocks: the non-`setup` block exists solely to set `name: 'LocalesListPage'` for `<KeepAlive>` / devtools, since `<script setup>` cannot declare a component name.
- `static`-only rows (deployed files with no dynamic DB record) render facts but **no action buttons** — they cannot be edited or deleted through the admin routes.
- The `active` flag does **not** hide a row from this list; it only controls whether a visitor can select the language. The admin always sees every row with its enabled/disabled chip.
- `deactivateThenDelete` is the page's guard-rail: the API refuses to delete an active language, so this page deactivates first and reactivates if the subsequent delete fails.
- The apps cell intentionally avoids `v-tooltip` (ARIA failures); it uses a visually-hidden sibling for the accessible description instead.
