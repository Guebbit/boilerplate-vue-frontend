# src/modules/locales/views/LocalesList.vue

## Purpose

Route view that renders the **languages board** — a thin CRUD screen over the locale manifest. It reads `LocaleCapability` rows from the locales store, writes through the store's language wrappers (create, edit, delete), and hosts the shared `LanguageFormDialog` for create/edit. It exists as the admin-facing entry point where an operator sees every language the deployment offers (both `static` and dynamic tiers) and manages their metadata.

## Key elements

- **`tableHeaders` (computed)** — declares the ten columns of the `DataTable` (`tag`, `name`, `nativeName`, `direction`, `tenants`, `source`, `entryCount`, `revision`, `active`, `actions`). The `actions` column is marked `synthetic: true` because its cell is rendered via a slot, not a data field.
- **`openCreate` / `openEdit`** — set `editing` to `undefined` (create) or a `LocaleCapability` row (edit), then flip `formOpen` to open `LanguageFormDialog`.
- **`handleSave(fields)`** — dispatches to `localesStore.createLanguage` or `localesStore.editLanguage` depending on whether `editing` is set; toasts success or routes the error through `notifyErrorMessages`.
- **`handleDelete(language)`** — opens a confirmation dialog (naming the tag and entry count), then **deactivates** the row if it is still active (the API refuses to delete an active language) before calling `localesStore.removeLanguage`.
- **`tenantKind(id)`** — resolves a tenant id to its `kind` for chip colouring; defaults to `'frontend'` until the tenant registry has loaded.
- **`onMounted`** — fires `fetchLanguages` and `fetchTenants` in parallel.
- **Template slots** — custom cell renderers for `tag` (with default/fallback chips), `nativeName` (RTL-aware `dir`), `tenants` (colour-coded chips with `sr-only` hints for accessibility), `source`, `active` (enabled/disabled chip), and `actions` (Entries / Edit / Delete buttons; all hidden when `source === 'static'`).

## Relationships

- **`@/modules/locales/store.ts` (`useLocalesStore`)** — primary data source; all reads (`capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `loading`) and writes (`createLanguage`, `editLanguage`, `removeLanguage`, `tenantLabel`) go through this Pinia store.
- **`@/modules/locales/components/LanguageFormDialog.vue`** — the create/edit dialog this page controls via `formOpen` and `editing`.
- **`@/ui/organisms/DataTable.vue`** — the shared table component that renders the locale rows.
- **`@/infrastructure/stores/dialog.ts` (`useDialogStore`)** — provides the confirm dialog used before deletion.
- **`@/infrastructure/utils/errors.ts` (`notifyErrorMessages`)** — centralises error-to-toast mapping for all failure paths.
- **`@/infrastructure/utils/logger.ts`** — appears in the dependency graph (likely pulled in transitively via `errors.ts` or the store); no direct import or call is visible in this file.

## Notes

- **Static-only rows are read-only.** When `source === 'static'` the actions cell renders nothing (no Edit, Delete, or Entries buttons) because there is no dynamic record behind the row. This is intentional, not a missing feature.
- **`active` never hides a row here.** The admin board always shows every locale; `active` only affects whether a visitor can select the language in the UI. The enabled/disabled chip is the admin's toggle.
- **Delete deactivates first.** The API guard-rails against deleting an active language, so `handleDelete` issues an `editLanguage({ active: false })` call before `removeLanguage`. The user-facing confirmation is this page's responsibility; the deactivation is the API's.
- **Accessibility choice in the tenants cell.** A `v-tooltip` was deliberately avoided (ARIA name issues with `axe`); instead a visually-hidden `<span class="sr-only">` sibling carries the explanatory text, and the chip uses `:title` for sighted users.
- **`tag` is the row identity.** `item-value="tag"` on `DataTable` and the `editing.value.tag` lookups confirm `tag` is the stable key throughout.
