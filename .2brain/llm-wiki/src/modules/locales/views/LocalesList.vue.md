---
source: src/modules/locales/views/LocalesList.vue
sha256: f7b628575de151b87c1775d6e5b7c243187a45811414206f30f1953c86c57917
generated_at: 2026-10-02T15:17:57.222433+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesList.vue

## Purpose

Route view for the "languages board" — a thin CRUD screen over the `LocaleCapability` manifest. It lists every language a deployment offers (both static and dynamic tiers), lets an admin create, edit, and delete languages, and toggles their active state. The component itself holds no data; all state and writes flow through the Pinia locales store.

## Key elements

- **`openCreate` / `openEdit`** — Open the shared `LanguageFormDialog` in create or edit mode by setting the `editing` ref and `formOpen`.
- **`handleSave`** — Routes to `localesStore.createLanguage` or `localesStore.editLanguage` depending on whether `editing` is set. On success, closes the dialog and fires a toast; on failure, delegates to the dialog's `applyServerErrors` (for field-level errors like duplicate tag) or falls back to `reportSaveError` (blocking alert).
- **`handleDelete`** — Prompts a Vuetify confirm dialog (via `useDialogStore`) that names the tag and entry count. On acceptance, calls `deactivateThenDelete` (deactivates an active locale before deletion, reactivates on failure) and reports success/error through `addMessage` / `reportDeleteError`.
- **`tableHeaders`** — Computed array of `CoreDataTableHeader<LocaleCapability>` defining the visible columns (tag, name, nativeName, direction, tenants, source, entryCount, revision, active, actions).
- **`tenantKind`** — Looks up a tenant's kind from the store's `tenants` list for chip colouring; defaults to `'frontend'` before the registry resolves.
- **`rowActionSize`** — Responsive button size from `useTouchFriendlySize` (small on desktop, larger on mobile for WCAG touch-target compliance).
- **`onMounted`** — Kicks off `localesStore.fetchLanguages()` and `localesStore.fetchTenants()`.

## Relationships

- **`@/modules/locales/store.ts`** — Primary data source: reads `capabilities`, `tenants`, `defaultLocale`, `fallbackLocale`, `loading` via `storeToRefs`; calls `fetchLanguages`, `fetchTenants`, `createLanguage`, `editLanguage`, `removeLanguage`.
- **`@/modules/locales/components/LanguageFormDialog.vue`** — Rendered in the template; invoked for its `applyServerErrors` method on save failure.
- **`@/modules/locales/domain/deactivate-then-delete.ts`** — Orchestrates the deactivate → delete → (on failure) reactivate sequence before the delete is reported.
- **`@/ui/organisms/DataTable.vue`** — The table rendering `capabilities` rows with per-column slots.
- **`@/ui/molecules/InlineErrorAlert.vue`** — Displays `deleteError` above the table when a deletion fails.
- **`@/infrastructure/utils/use-blocking-error.ts`** — Provides the `message` / `report` / `clear` triple used for both the save-blocking and delete-blocking alert states.
- **`src/infrastructure/utils/logger.ts`** — No direct import or call is visible in this file's content; any interaction would be indirect (e.g., through the store or the `deactivateThenDelete` utility).

## Notes

- **Static-only rows are intentionally non-editable.** A `LocaleCapability` whose source is `static` (deployed files with no dynamic DB record) renders its facts but exposes no action buttons. This is a deliberate "honest rendering," not a bug.
- **`active` does not hide rows.** An inactive language still appears in the admin table with an enabled/disabled chip; `active` only gates visitor selection, not admin visibility.
- **Error presentation is split by context.** Save failures block the dialog in place (dialog stays open); delete failures block the board via an `InlineErrorAlert` above the table. Toasts are used only for successful outcomes.
- **The delete confirm dialog names the cost** (`tag` + `entryCount`) because deletion is irreversible and wipes all translated content for that language.
- **Tenant chips use a visually-hidden `<span>` sibling** rather than `aria-label` or `v-tooltip` to satisfy axe accessibility rules (`aria-prohibited-attr`, screen-reader reachability).
