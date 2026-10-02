---
source: src/modules/locales/components/EntriesImportDialog.vue
sha256: 544416e9eda03ec6c547eb889ea19cf08e5bfa2ff72a9a1454490e466dadd1ae
generated_at: 2026-10-02T15:11:39.769246+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntriesImportDialog.vue

## Purpose

A self-contained dialog that accepts a locale-entry dictionary (as nested JSON via file upload or paste), parses and flattens it into flat `LocaleEntryInput` rows, and emits the result upward on submit. It owns no persistence or API calls — the parent handles the actual write and renders transport/batch errors through the `error` slot.

## Key elements

- **Props** — `tenants` (select options), `initialTenant` (preselection), `saving` (disables submit while the parent's write is in flight).
- **`isOpen` (`defineModel<boolean>`)** — two-way open/close binding; the dialog does not declare its own prop or re-emit.
- **`emit('import', payload)`** — single event carrying `{ mode: 'merge' | 'replace', tenant, entries }`; the parent is responsible for the network call.
- **`rawJson` / `parsed` (computed)** — holds the pasted or file-read text; `parsed` performs `JSON.parse`, shape-checks (non-null object, not an array), calls `flattenDictionary`, and returns either `{ entries }` or `{ error }`.
- **`handleFile`** — reads a picked `.json` file via `File.text()` and writes the content into `rawJson`, so both input paths feed the same parse.
- **`handleImport`** — guards on `parsedEntries`, runs a destructive-action confirmation (`useDialogStore().confirm`) when mode is `replace`, then emits `import`.
- **`modeOptions` (computed)** — the two radio labels, i18n-keyed (`entries-import.mode-merge` / `mode-replace`).
- **`fullscreen` / `useReturnFocus`** — responsive fullscreen on small screens; restores focus to the triggering control on close.
- **`error` slot** — reserved for the parent's `InlineErrorAlert`; this component deliberately has no opinion on what a blocked import looks like.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — imports `flattenDictionary`, the pure function that converts a nested `TranslationDictionaries` object into a flat `LocaleEntryInput[]` array. This is the only cross-file logic dependency; the dialog delegates all shape-flattening to it.

## Notes

- The component intentionally avoids `useStructureFormValidation` (used by the sibling form dialogs). The validation target here is a JSON document whose useful output is the parsed rows, not per-field error messages, so a hand-rolled computed with `try/catch` is preferred.
- `replace` mode triggers a `useDialogStore().confirm` with the tenant name and entry count before emitting — this is the only user-facing safeguard against an accidental destructive overwrite.
- Both the file input and the textarea share the same `aria-describedby` / `aria-invalid` bindings pointing at the single `parseError` paragraph, so screen readers associate the error with whichever input was used.
- The `saving` prop (not a local flag) drives the submit button's `:loading` and `:disabled`, ensuring the parent is the single source of truth for in-flight state.
