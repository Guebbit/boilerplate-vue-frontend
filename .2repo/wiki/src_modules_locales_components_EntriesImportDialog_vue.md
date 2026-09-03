# src/modules/locales/components/EntriesImportDialog.vue

## Purpose

A Vuetify dialog that lets a user import locale entries by pasting or uploading a JSON dictionary (the same shape as `src/locales/*.json` files), flattens it into `LocaleEntryInput[]` rows, and emits the result upward. It presents a tenant selector and a merge/replace mode choice, with an extra confirmation step for destructive replaces. The component performs no persistence itself — it only parses, validates shape, and emits.

## Key elements

- **Props** — `tenants: LocaleTenantDescriptor[]` (available destinations) and optional `initialTenant` (preselection on open).
- **`isOpen` (defineModel)** — two-way visibility binding; parent controls open/close.
- **`emit('import', …)`** — single event carrying `{ mode: 'merge' | 'replace', tenant, entries: LocaleEntryInput[] }`.
- **`rawJson` (ref)** — the shared text buffer fed by both the file picker and the textarea.
- **`handleFile`** — reads a picked `.json` file via `File.text()` and writes its content into `rawJson`.
- **`parsed` (computed)** — core parse pipeline: `JSON.parse` → shape guard → `flattenDictionary` → row-count check. Returns either `{ entries }` or `{ error }`.
- **`parsedEntries` / `parseError` (computed)** — convenience projections of `parsed` used by the template (preview count, error alert, submit-button disable).
- **`modeOptions` (computed)** — i18n-labelled radio choices for merge vs. replace.
- **`handleImport`** — guard on `parsedEntries`, fires a `useDialogStore().confirm` dialog when mode is `replace`, then emits the payload.
- **Template** — `v-dialog` (fullscreen on mobile via `useDisplay`), a single `<form>` with `fieldset` grouping the two input sources and the shared error, tenant `v-select`, mode `v-radio-group`, a success preview line, and cancel/submit buttons.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — imports `flattenDictionary`, which converts a nested `TranslationDictionaries` object into the flat `LocaleEntryInput[]` rows the API expects. This is the only production dependency from the locales module; the component relies on it for the "nested in, flat out" transformation.

## Notes

- **No form-validation library.** The file deliberately skips `useStructureFormValidation` (used by sibling form dialogs) because the "form" here is a JSON document; the useful output is the parsed rows, not per-field errors. A schema/transform layer would duplicate what `parsed` already does.
- **Replace is destructive by contract.** The radio label and the confirmation dialog both state that unsent keys are deleted. The confirm dialog names the tenant and entry count so the user can veto.
- **Single source of truth for input text.** File picker and textarea both write into `rawJson`; the one error line below the fieldset is referenced (`aria-describedby`) by both inputs, so screen-reader users hear the same reason regardless of which input they used.
- **`eslint-disable` on `JSON.parse`** — the codebase restricts `eval`-family calls; the comment notes there is no non-throwing alternative and the `catch` converts it into a user-facing message.
- **Accessibility IDs** — `useId()` generates `titleId` and `errorId`; the dialog uses `aria-labelledby` and the error paragraph uses `role="alert"` so changes are announced.
