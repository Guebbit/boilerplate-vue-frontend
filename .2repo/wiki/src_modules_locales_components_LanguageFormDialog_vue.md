# src/modules/locales/components/LanguageFormDialog.vue

## Purpose

A create-or-edit dialog for a single language (locale capability). The same component handles both modes; the only behavioral difference is that the `tag` field is writable on create and disabled on edit (the API treats it as immutable). It validates via a schema, resets on every open, and emits the saved fields upward.

## Key elements

- **`props.language?`** — when present the dialog is in edit mode; when absent it is create mode.
- **`isOpen` (via `defineModel`)** — two-way boolean controlling visibility; the parent owns the state.
- **`isEdit`** — computed boolean derived from `props.language !== undefined`; drives heading, hint text, and tag-field disabled state.
- **`useAppForm`** — returns `form`, `formErrors`, `showFormErrors`, `handleSubmit`, and `setForm`. The schema is a `computed` that switches between `localesLanguageSchema` (create, tag required) and `localesLanguageEditSchema` (edit, tag excluded) based on `isEdit`.
- **`watch(isOpen, …)`** — on every open, calls `setForm` with the current `language` values or empty defaults, preventing stale data from a prior use of the same instance.
- **`handleSave`** — calls `handleSubmit`; on success emits `save` with the typed fields object; on failure `handleSubmit` surfaces `formErrors`.
- **`directionOptions`** — computed pair of `{ value, title }` entries (`ltr`/`rtl`) for the `v-select`, labels pulled from i18n.
- **`titleId`** — from Vue's `useId()`, applied to the `<h2>` and passed to `v-dialog`'s `aria-labelledby` for accessible naming.

## Relationships

No graph neighbors recorded. The file imports from:

- `@/infrastructure/composables/use-app-form.ts`
- `@/modules/locales/schemas.ts` (`localesLanguageSchema`, `localesLanguageEditSchema`)
- `@types` (type-only: `LocaleCapability`, `LocaleDirection`)
- `vue-i18n`, `vue`

## Notes

- **Single-instance reuse:** the parent keeps one dialog mounted and reopens it. The `watch(isOpen)` reset is therefore essential; there is no unmount/remount cycle.
- **Two schemas, not one conditional rule:** the edit schema omits `tag` entirely rather than making it optional-then-required, so validation errors are unambiguous.
- **Submit button is never disabled:** an invalid form still triggers `handleSubmit`, which then displays the error messages. A greyed-out button would give no feedback.
- **`novalidate` on `<form>`:** the browser's native validation is suppressed so the Zod/schema errors from `useAppForm` are the single source of truth.
