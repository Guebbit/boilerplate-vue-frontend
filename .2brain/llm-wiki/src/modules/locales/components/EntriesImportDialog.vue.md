---
source: src/modules/locales/components/EntriesImportDialog.vue
sha256: 3ff86bad49e9300bc55b2ac84ae22b0afdc02c13f5ac64570319dcf315613a88
signature: affd6ad68a5f6b0b71022b3fcc71169ad02b10e6c2d58c373cc82ad2345aa24d
generated_at: 2026-11-10T04:38:17.210876+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntriesImportDialog.vue

## Purpose
A dialog that lets a translator paste or upload a nested locale JSON file (the same shape as `src/locales/*.json`), previews the flattened row count, and emits the parsed rows upward for the parent to persist. The component performs no network call itself; it only parses, validates, and hands off.

## Key elements
- **`props`** — `apps` (available destination apps), `initialApp` (preselect on open), `saving` (disables submit while the parent's write is in flight).
- **`emit('import', { mode, app, entries })`** — the single outward signal carrying the flattened `DictionaryRow[]`, the chosen mode (`merge` | `replace`), and the destination app id.
- **`isOpen` (`defineModel<boolean>`)** — two-way binding controlling dialog visibility; no manual `update:modelValue` re-emit.
- **`rawJson` (ref)** — single source of truth for the JSON text, fed by either the file picker or the textarea.
- **`parsed` (computed)** — runs `parseJsonSafe`, type-guards the result, calls `flattenDictionary`, and checks for duplicate keys via `findDuplicateKey`. Returns `{ entries }` on success or `{ error }` on any failure.
- **`handleFile`** — reads a picked `.json` file's text into `rawJson` so both input paths converge on the same parse.
- **`handleImport`** — on `replace`, shows a blocking confirmation via `useDialogStore().confirm` (naming the target app and row count); on `merge`, skips confirmation. Emits `import` on acceptance.
- **`error` slot** — reserved for the parent to inject its own `InlineErrorAlert` (batch rejection, transport failure); the dialog deliberately has no opinion on post-parse failures.

## Relationships
- **`src/modules/locales/dictionaries.ts`** — provides `flattenDictionary`, `findDuplicateKey`, and the `DictionaryRow` type that the dialog's `parsed` computed and `emit` payload depend on.
- **`src/modules/locales/tests/entries-import-dialog.spec.ts`** — unit tests for this component (parse validation, duplicate detection, mode emission, slot rendering).
- **`src/modules/locales/views/LocaleEntries.vue`** — parent view that owns the dialog's `v-model`, supplies `apps`/`initialApp`/`saving`, listens for the `import` emit to perform the actual save, and renders content into the `error` slot.

## Notes
- Validation is **not** handled by `useStructureFormValidation` (unlike the sibling form dialogs) because the meaningful output is the parsed rows, not per-field errors; a schema transform would add no value over the existing `parsed` computed.
- Both the file input and the textarea set `aria-describedby` / `aria-invalid` pointing at the single parse-error `<p>` (identified by `useId()`), so screen-reader users hear the same rejection regardless of which input they used.
- Opening the dialog (`isOpen` → `true`) resets `app`, `mode`, and `rawJson` to defaults; there is no persistence between open/close cycles.
- The `saving` prop gates the submit button with `:loading` **and** `:disabled`, preventing a second click or Enter-key submit while the parent's request is in flight.
- The `replace` confirmation is a **modal dialog** (via the global dialog store), not an inline confirm; cancelling it silently aborts without emitting.
