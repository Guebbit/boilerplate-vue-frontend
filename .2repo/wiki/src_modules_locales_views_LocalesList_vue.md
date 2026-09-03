# src/modules/locales/views/LocalesList.vue

## Purpose

Route-level Vue view ("languages board") that renders a CRUD table over the locale manifest. Admins can create, edit, and delete `LocaleCapability` rows, toggle their active state, and navigate to the dictionary or per-language entry views. The view is intentionally read-only for `static`-source locales, which have no dynamic record to mutate.

## Key elements

- **Component name** — `LocalesListPage` (declared in the non-setup `<script>` block).
- **`tableHeaders`** — computed `CoreDataTableHeader<LocaleCapability>[]`; defines columns for tag, name, nativeName, direction, tenants, source, entryCount, revision, active, and a synthetic `actions` column.
- **`openCreate` / `openEdit`** — set `editing` (absent = create) and open `LanguageFormDialog` via `formOpen`.
- **`handleSave`** — dispatches `localesStore.createLanguage` or `editLanguage`; closes the dialog on success, surfaces errors via `notifyErrorMessages`.
- **`handleDelete`** — prompts confirmation through `useDialogStore().confirm`; if the row is active, deactivates it first (API guard rail) before calling `removeLanguage`.
- **`tenantKind`** — resolves a tenant id to its kind for chip colour/hint; defaults to `'frontend'` before the tenant registry resolves.
- **`rowActionSize`** — from `useTouchFriendlySize`; switches button size between desktop and mobile to meet WCAG touch-target guidance.
- **Template slots** — custom rendering for `tag` (with default/fallback chips), `nativeName` (direction-aware), `tenants` (colour-coded chips with accessible hints), `source`, `active`, and `actions` (hidden for `static` rows).

## Relationships

- **`src/modules/locales/store.ts`** — primary data source and mutation target; reads `capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `loading` via `storeToRefs`; writes via `createLanguage`, `editLanguage`, `removeLanguage`, `fetchLanguages`, `fetchTenants`.
- **`src/modules/locales/components/LanguageFormDialog.vue`** — shared create/edit dialog; open/close and edit context are driven by the `formOpen` / `editing` refs here.
- **`src/ui/organisms/DataTable.vue`** — renders the locale rows; receives `tableHeaders`, `capabilities`, and loading state.
- **`src/infrastructure/utils/errors.ts`** — `notifyErrorMessages` formats and dispatches error toasts.
- **`src/infrastructure/utils/logger.ts`** — transitive dependency reached through the error/notification pipeline (`errors.ts` → logger).
- **`src/app/layouts/LayoutDefault.vue`** — page shell providing the heading and main content area.
- **`@guebbit/vue-toolkit`** — `useNotificationsStore` supplies the `addMessage` toast function.

## Notes

- **`static`-source rows are read-only.** They display their facts (tag, name, direction, etc.) but expose no edit/delete buttons because there is no dynamic record behind them.
- **Delete is two-step for active locales.** The API rejects deletion of an active language; `handleDelete` deactivates first, then removes. The confirmation dialog names the entry count so the admin knows the blast radius.
- **`active` never hides a row here.** It only gates whether a visitor may select the language. The admin sees every locale with an enabled/disabled chip and is the one who toggles it.
- **Tenant chips use `title` + `sr-only` span instead of `v-tooltip`.** A non-interactive chip renders as a role-less `<span>`, making `aria-label` an `aria-prohibited-attr` under axe rules; the visually-hidden sibling satisfies screen-reader access without that violation.
- **`onMounted` fires two async fetches** (`fetchLanguages`, `fetchTenants`) without awaiting; the `loading` ref gates the table until data arrives.
