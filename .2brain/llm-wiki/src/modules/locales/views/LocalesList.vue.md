---
source: src/modules/locales/views/LocalesList.vue
sha256: b5bc9cc3588c0f894def4724de3fd6026071fd4b11f1733b067ae3e925a33341
signature: b5bc9cc3588c0f894def4724de3fd6026071fd4b11f1733b067ae3e925a33341
generated_at: 2026-11-10T04:47:32.414570+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/views/LocalesList.vue

## Purpose

Route view for the languages board: a thin CRUD screen over the merged `Language` manifest. It lists every language the deployment offers (both static and dynamic tiers), lets the admin create, edit, activate/deactivate, and delete languages, and opens the shared `LanguageFormDialog` for create/edit. The page exists as the admin-facing surface for managing which languages the product can answer in.

## Key elements

- **Component name** — `LocalesListPage`, declared in the options `<script>` block (required alongside `<script setup>` for `<KeepAlive>`/devtools).
- **`openCreate` / `openEdit`** — Open `LanguageFormDialog` in create or edit mode. `openEdit` also fires `localesStore.fetchLanguage(tag)` to obtain a fresh `ETag` for the subsequent `If-Match` save.
- **`handleSave`** — Delegates to `localesStore.createLanguage` or `editLanguage`. On 412, defers to `useStaleRecord`'s reload flow; on 409 (duplicate tag), routes the error to the dialog's `applyServerErrors`; on anything else, blocks the dialog via `useBlockingError`.
- **`handleSwitch`** — Wraps `activateLanguage`/`deactivateLanguage` in `singleFlight`; failures surface as a board-level `InlineErrorAlert`.
- **`handleDelete`** — Shows a confirmation dialog (via `useDialogStore().confirm`) whose message names the entry count and active state, then calls `removeLanguage`. Also `singleFlight`-wrapped.
- **`tableHeaders`** — Computed `CoreDataTableHeader<Language>[]` listing: tag, name, nativeName, direction, apps, source, entryCount, revision, active, and a synthetic `actions` column.
- **`useStaleRecord`** — Handles 412 responses by re-fetching the language, closing the dialog for a tick (`nextTick`), then reopening it on the fresh row.
- **`useBlockingError`** (two instances) — One for the dialog save (`saveError`), one for row actions (`deleteError`); each provides `report`/`warn`/`clear`.
- **`useAmbientError`** — Toasts background-read failures (initial `fetchLanguages`/`fetchApps`) where no form can host an inline alert.
- **`appKind`** — Resolves an app id to its `kind` (defaulting to `'frontend'`) for chip colouring in the apps column.
- **`onMounted`** — Kicks off `fetchLanguages` and `fetchApps` against the store.

## Relationships

- **`src/modules/locales/store.ts`** — Primary data source. The view reads `capabilities`, `apps`, `defaultLocale`, `fallbackLocale`, `loading` via `storeToRefs`, and calls `fetchLanguages`, `fetchApps`, `fetchLanguage`, `createLanguage`, `editLanguage`, `activateLanguage`, `deactivateLanguage`, `removeLanguage`.
- **`src/modules/locales/components/LanguageFormDialog.vue`** — Rendered as the create/edit dialog. The view controls its `open`/`editing` state and calls its `applyServerErrors` method to surface field-level validation failures after a save.
- **`src/modules/locales/tests/languages-list-actions.spec.ts`** — Exercises the row-action flows (create, edit, activate, deactivate, delete) rendered by this view.
- **`src/modules/locales/tests/confirm-once.spec.ts`** — Tests the confirm-before-delete behaviour driven by `useDialogStore().confirm` in this view.

## Notes

- **Two distinct error channels:** Dialog-save failures block the dialog in place (it stays open); row-action failures (switch/delete) surface in a single `InlineErrorAlert` above the table because there is no per-row slot to host them. The dialog's own save errors are *not* toasted on success-adjacent failure — they stay inline per the convention in `docs/theory/request-flow.md`.
- **ETag / `If-Match` pattern:** The list view does not carry per-row ETags. The edit flow explicitly re-fetches the single language (`fetchLanguage`) to obtain a fresh ETag before the dialog saves. A 412 triggers `useStaleRecord`'s reload-reopen cycle.
- **`singleFlight`** wraps both `handleSwitch` and `handleDelete` to prevent duplicate in-flight writes on rapid clicks.
- **`useTouchFriendlySize`** switches row-action button size between `small` (desktop) and the Vuetify default (mobile) to meet WCAG touch-target minimums.
- **Static-only languages:** Rows whose `source` is purely static show their data but render no action buttons — the admin routes cannot mutate them. The `active` flag is always visible as a chip (toggle available only when `actions.delete`/`actions.activate`/`actions.deactivate` are present on the row).
