---
source: src/modules/locales/components/LanguageFormDialog.vue
sha256: f95f56d8c07234c001ce8d73da982ae4beebbf8d68f8a1073ac1454524abdc4f
generated_at: 2026-10-17T01:03:10.259303+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/LanguageFormDialog.vue

## Purpose
A create-or-edit dialog for a single language entry in the locales module. It renders a schema-validated form (via `useStructureFormValidation`) that swaps between a create schema and an edit schema depending on whether the `language` prop is present, resets its fields on every open, and emits the validated fields upward. It deliberately carries no save logic or error handling of its own; the parent owns both the open state and any post-validation failure.

## Key elements
- **`props.language?: LocaleCapability`** — Present → edit mode (tag field disabled); absent → create mode.
- **`props.saving?: boolean`** — Disables the submit button while the parent's write is in flight to prevent double-submit.
- **`defineModel<boolean>` (`isOpen`)** — Two-way binding for dialog visibility; the parent owns it.
- **`emit('save', fields)`** — Fires with `{ tag, name, nativeName, direction, active }` after client validation passes; the parent then performs the actual write.
- **`defineExpose({ applyServerErrors })`** — Lets a parent map a server-side field error back onto the form (e.g., "tag already exists") without the dialog knowing what the server returned.
- **`<slot name="error" />`** — Rendered above the buttons; parents inject their own `InlineErrorAlert` here when the save is rejected after the form already validated clean.
- **`watch(isOpen, …)`** — Refills the form from `props.language` (or defaults) every time the dialog opens, so a reused instance never leaks stale values.
- **`isEdit` computed** — Drives the heading text, the tag field's `disabled` state, and which schema is active.
- **`useFullscreenDialog` / `useReturnFocus`** — Responsive full-screen on small viewports; restores focus to the trigger element on close.

## Relationships
- **`src/modules/locales/schemas.ts`** — Imports `localesLanguageSchema` (create) and `localesLanguageEditSchema` (edit); the active schema is selected reactively via a `computed` passed to `useStructureFormValidation`.
- **`src/modules/locales/views/LocalesList.vue`** — Parent consumer; uses the dialog for row-level editing of an existing language and fills the `error` slot with its own save-failure alert.
- **`src/modules/locales/views/LocalesDictionary.vue`** — Parent consumer; uses the dialog for adding a new language (no `language` prop) and similarly renders its own error state in the `error` slot.
- **`src/modules/locales/tests/form-dialogs.spec.ts`** — Unit/integration tests exercising this component's validation, create-vs-edit swap, and emit contract.

## Notes
- The submit button is **never disabled on invalidity**—`handleSubmit` is always callable and will display field errors. Disabling it would hide *why* the form can't proceed.
- The `tag` field is shown (not hidden) but disabled on edit because it is the immutable identifier every other locale entry references; hiding it would obscure what is being edited.
- The component is a **single reused instance** per parent (not one-per-row), so the open-time `setForm` reset is load-bearing: without it, a previously edited language's values would bleed into the next open.
- `revalidateOn: locale` in the validation options means all error messages re-render when the app's active locale changes.
