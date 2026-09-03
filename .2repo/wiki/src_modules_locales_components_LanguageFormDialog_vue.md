# src/modules/locales/components/LanguageFormDialog.vue

## Purpose

A create-or-edit dialog for a single language (locale capability). It swaps between two validation schemas based on whether the `language` prop is present, resets the form on every open, and emits the saved fields upward. The component exists to centralize the one-field difference between the two modes (the `tag` field is editable on create, disabled on edit) in a single reusable dialog.

## Key elements

- **`props.language`** — optional `LocaleCapability`; when absent the dialog is in create mode, when present it is in edit mode.
- **`emit('save', fields)`** — emits the validated fields (`tag`, `name`, `nativeName`, `direction`, `active`) after successful submission.
- **`isOpen` (`defineModel<boolean>`)** — two-way binding controlling dialog visibility; the parent owns the value.
- **`isEdit` (computed)** — true when `props.language` is defined; drives heading text, the disabled `tag` field, and which schema is active.
- **`useStructureFormValidation`** — returns `form`, `formErrors`, `showFormErrors`, `handleSubmit`, and `setForm`. The schema is a computed that selects between `localesLanguageSchema` and `localesLanguageEditSchema` based on `isEdit`.
- **`watch(isOpen)`** — on every open, calls `setForm` with the language's values or empty defaults, preventing stale data from a previous session.
- **`handleSave`** — delegates to `handleSubmit`, which either calls the success callback (emitting `save`) or marks `showFormErrors` and fires the `onInvalid` notification.
- **`directionOptions` (computed)** — the two `v-select` items (`ltr` / `rtl`) built from i18n strings.
- **`mobile` (from `useDisplay`)** — when true, the `v-dialog` renders `fullscreen` instead of at a fixed `max-width="480"`.

## Relationships

No graph neighbors are recorded for this file.

## Notes

- **Two schemas instead of one conditional rule.** The `tag` field is required on create but absent (disabled) on edit. The codebase treats a "sometimes required" field as unreadable, so two flat schemas are preferred.
- **Form reset on open, not on mount.** The dialog is a single long-lived instance reused by the page; the `watch(isOpen)` guard ensures yesterday's values never leak into today's create.
- **Save button is never `:disabled`.** By design: `handleSubmit` surfaces validation messages and a notification, whereas a greyed-out button explains nothing.
- **Accessibility:** the `<h2>` carries a `useId()` value passed to `:aria-labelledby` so screen readers announce the dialog by its title.
- **`revalidateOn: locale`** in the validation options means schema messages re-resolve when the app locale changes.
- **`VUETIFY_INVALID_FIELD_SELECTOR`** is imported from `@/infrastructure/utils/errors.ts` and used to let the toolkit scroll to / highlight the first invalid field.
