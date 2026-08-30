# src/modules/locales/components/EntriesImportDialog.vue

## Purpose

A Vuetify dialog that lets a translator paste or upload a nested JSON locale dictionary (the same shape as the bundled `src/locales/*.json` files) and submit it as flattened rows for a chosen tenant, in either `merge` or `replace` mode. It is purely presentational with respect to persistence: it parses, validates, and emits the `import` event upward; it never writes anything itself.

## Key elements

- **`props`** — `tenants: LocaleTenantDescriptor[]` (the registry the select offers) and optional `initialTenant` (preselected on open).
- **`emit('import', …)`** — emits `{ mode, tenant, entries: LocaleEntryInput[] }`; the parent handles the API call.
- **`isOpen`** — two-way `defineModel<boolean>` controlling dialog visibility.
- **`rawJson`** — single source of truth for the pasted *or* file-read text; both inputs converge here.
- **`handleFile`** — reads a picked `.json` file via `File.text()` and writes its content into `rawJson`.
- **`parsed` (computed)** — runs `JSON.parse`, type-checks the result, calls `flattenDictionary`, and returns either `{ entries }` or `{ error }`. This is the only place parsing/validation lives.
- **`parsedEntries` / `parseError`** — convenience projections of `parsed` for the template.
- **`mode` / `modeOptions`** — radio binding (`'merge'` | `'replace'`) with i18n labels that carry the destructive semantics of replace.
- **`handleImport`** — on submit, if mode is `replace` it calls `useDialogStore().confirm(…)` for a second confirmation; on acceptance it emits the `import` event.
- **`watch(isOpen)`** — resets tenant, mode, and rawJson every time the dialog reopens.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — provides `flattenDictionary`, the single function that converts a nested `TranslationDictionaries` object into the flat `LocaleEntryInput[]` rows this dialog emits. The dialog has no other coupling to the dictionaries module.

## Notes

- **Deliberately not on `useAppForm`.** The component's comment explains that the validation target is a whole JSON document whose useful output is the parsed rows (used by the preview), not per-field errors. A form-schema transform would duplicate what `parsed` already computes.
- **Replace is the only destructive path.** Merge upserts and deletes nothing; replace makes the tenant *exactly* the submitted rows. The radio label and the confirmation dialog both make this explicit, and the confirmation names the affected tenant and row count.
- **Both input paths (file and textarea) share one error element.** The `<p role="alert">` is referenced via `aria-describedby` from *both* `v-file-input` and `v-textarea`, so a screen-reader user hears the parse failure regardless of which input they used.
- **`rawJson` starts empty and resets on every open.** There is no persisted draft; the dialog is stateless across sessions.
- **The submit button is disabled** until `parsedEntries` is non-null, i.e. the JSON has parsed into at least one row.
