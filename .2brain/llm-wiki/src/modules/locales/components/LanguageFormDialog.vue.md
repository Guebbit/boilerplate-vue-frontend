---
source: src/modules/locales/components/LanguageFormDialog.vue
sha256: 651ebc74a0175a0c743bc50df30f1fc935e0dbda46c9048f314800c48f831152
generated_at: 2026-10-02T15:12:30.083047+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/LanguageFormDialog.vue

## Purpose

A create-or-edit dialog for a single language entry in the locales module. It swaps between two Zod schemas (create vs. edit) based on whether a `language` prop is supplied, validates the form via `useStructureFormValidation`, and emits the saved fields upward. All open/close state and server-side save logic are owned by the parent.

## Key elements

- **`props.language`** — optional `LocaleCapability`; presence switches the dialog into edit mode (tag field disabled, edit schema active).
- **`props.saving`** — disables the submit button while the parent's write is in flight to prevent double-submit.
- **`isOpen` (`defineModel<boolean>`)** — two-way binding for the dialog's open state; the parent owns it.
- **`emit('save', fields)`** — fires after validation passes with `{ tag, name, nativeName, direction, active }`.
- **`applyServerErrors` (via `defineExpose`)** — lets the parent map a server-side refusal back onto a specific form field after the local schema already validated clean.
- **`<slot name="error" />`** — reserved for the parent to render its own `InlineErrorAlert` above the buttons; the dialog has no opinion on what a blocked save looks like.
- **`watch(isOpen, …)`** — resets the form to the current language's values (or defaults) on every open, so a reused single instance never leaks stale values.
- **`directionOptions`** — computed list of `ltr` / `rtl` choices for the `v-select`.
- **`handleSave`** — calls `handleSubmit` which either invokes the emit callback or toggles `showFormErrors`.

## Relationships

- **`src/modules/locales/schemas.ts`** — provides `localesLanguageSchema` (create) and `localesLanguageEditSchema` (edit); the component selects between them via a computed passed to `useStructureFormValidation`.
- **`@guebbit/vue-toolkit`** — supplies `useStructureFormValidation` (form state, validation, `applyServerErrors`) and `useNotificationsStore` (toast on invalid submit).
- **`@/ui/composables/use-fullscreen-dialog.ts`** — determines whether the dialog goes fullscreen on small viewports.
- **`@/ui/composables/use-return-focus.ts`** — restores focus to the triggering control on close.
- **`@/ui/vuetify/selectors.ts`** — exports `VUETIFY_INVALID_FIELD_SELECTOR` used to scroll/focus the first invalid field.
- **`@types`** — `LocaleCapability` and `LocaleDirection` type definitions for props and form shape.

No visible interaction with `src/modules/account/views/TwoFactorChallenge.vue` exists in this file's imports, template, or logic.

## Notes

- The tag field is **disabled** (not hidden) on edit because it is the immutable identifier every other locale entry references; the UI states this explicitly rather than silently omitting the field.
- The submit button is never disabled on validation failure — `handleSubmit` is expected to show inline error messages. It is only disabled/loaded while `saving` is true.
- The dialog is a **single instance reused across the page** (e.g., row-edit in `LocalesList.vue` and add in `LocalesDictionary.vue`); the `watch(isOpen)` reset is what prevents cross-use value leakage.
- `revalidateOn: locale` is passed to `useStructureFormValidation`, so switching the active UI locale re-runs validation messages (e.g., translated error copy).
