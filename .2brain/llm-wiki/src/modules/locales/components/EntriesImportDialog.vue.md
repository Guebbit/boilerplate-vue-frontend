---
source: src/modules/locales/components/EntriesImportDialog.vue
sha256: e37361845e16330be4bf702c4af6428c91d1abf91d80fa8d2111acb9fa62f47e
generated_at: 2026-10-17T01:02:42.732559+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntriesImportDialog.vue

## Purpose

A modal dialog that lets a translator import locale entries by pasting or uploading a nested JSON dictionary (the same shape as bundled `src/locales/*.json` files). It validates the input client-side, flattens the dictionary into flat `LocaleEntryInput` rows, and emits them upward with a chosen mode (`merge` | `replace`) and destination app. The component performs no persistence itself.

## Key elements

- **Props** — `apps` (available app descriptors for the select), `initialApp` (preselected app on open), `saving` (disables submit while the parent's write is in flight).
- **`defineModel<boolean>` (`isOpen`)** — two-way visibility binding; the dialog neither declares an `open` prop nor emits `update:open` manually.
- **`emit('import', …)`** — fires with `{ mode, app, entries }` after an optional replace-confirmation.
- **`parsed` (computed)** — attempts `JSON.parse` on the raw text, type-checks the result as a non-null, non-array object, calls `flattenDictionary`, and returns either `{ entries }` or `{ error }`. Drives both the success preview line and the inline error message.
- **`handleFile`** — reads a picked `.json` file into the same `rawJson` ref as the textarea, so both input paths share one parse pipeline.
- **`handleImport`** — guards on `parsedEntries`, shows a destructive-confirmation dialog (via `useDialogStore().confirm`) when mode is `replace`, then emits.
- **Slot `error`** — reserved for the parent to render its own `InlineErrorAlert` (e.g. server-side batch rejection) above the action buttons.
- **Composables** — `useFullscreenDialog` (responsive full-screen on small viewports), `useReturnFocus` (restores focus to the trigger on close), `useI18n` (all copy is keyed under the `entries-import.*` namespace).
- **Accessibility** — `useId` for the dialog title (`aria-labelledby`) and the parse error (`aria-describedby` on both the file input and the textarea); the error `<p>` carries `role="alert"`.

## Relationships

- **`src/modules/locales/dictionaries.ts`** — provides `flattenDictionary`, the pure function that converts the nested `TranslationDictionaries` shape into a flat `LocaleEntryInput[]` array. This is the only import from that module.
- **`src/modules/locales/views/LocaleEntries.vue`** — the parent view that renders this dialog, supplies the `apps` / `initialApp` / `saving` props, listens for the `import` emit to perform the actual write, and fills the `error` slot with its own failure alert.
- **`src/modules/locales/tests/entries-import-dialog.spec.ts`** — unit/integration tests exercising parse success, parse failure, mode selection, the replace confirmation flow, and the emit payload.

## Notes

- **Deliberately no `useStructureFormValidation`** — the file's comment explains that the useful validation output is the *flattened rows*, not per-field errors; a schema/transform pipeline would duplicate what `parsed` already produces.
- **Replace confirmation is component-owned** — `useDialogStore().confirm` is called inside `handleImport` before the emit, so the parent never sees a `replace` payload without a second human confirmation. The merge path resolves `Promise.resolve(true)` immediately.
- **`saving` is a prop, not local state** — the dialog has no opinion on when the parent's write finishes; the parent flips `saving` to lock the submit button and prevent double-sends.
- **The `error` slot is for *post-parse* failures** (server rejection, transport error). Parse failures are handled internally via `parseError`; the slot is only for what happens *after* a clean emit.
