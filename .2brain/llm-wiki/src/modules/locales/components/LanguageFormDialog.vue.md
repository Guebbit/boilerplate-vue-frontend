---
source: src/modules/locales/components/LanguageFormDialog.vue
sha256: 7c023742d33f8bcbfd534c8251671a8f6e4dcfc43ad710ea918be65b265e62f4
signature: d29ee254ff634c56e58d074f54149704284b6429196bcfc016b791e58ac3113f
generated_at: 2026-11-10T04:38:59.640758+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/LanguageFormDialog.vue

## Purpose

Create-or-edit dialog form for a single language entry in the locales module. It validates input against a schema (selected by create vs. edit mode) via `useStructureFormValidation`, resets its fields on every open, and emits the validated fields upward to whichever parent owns the save request.

## Key elements

- **`props.language`** — when present, the dialog switches to edit mode (tag disabled, active switch hidden); when absent, it's create mode.
- **`props.saving`** — disables the submit button while the parent's request is in flight.
- **`isOpen` (defineModel)** — two-way `v-model` controlling dialog visibility; the parent owns open/close state.
- **`emit('save', fields)`** — fires after schema validation passes with `{ tag, name, nativeName, direction, active }`.
- **`useStructureFormValidation`** — drives form state, per-field errors, and the `handleSubmit` / `applyServerErrors` / `setForm` helpers. Schema is a `computed` that picks between `localesLanguageSchema` and `localesLanguageEditSchema`.
- **`watch(isOpen, …)`** — refills the form from `props.language` (or defaults) every time the dialog opens, so stale values never leak between uses.
- **`directionOptions`** — computed pair of `{ value: 'ltr'|'rtl', title }` for the direction select, i18n-labelled.
- **`defineExpose({ applyServerErrors })`** — lets a parent map a server-side refusal onto a specific form field.
- **`<slot name="error">`** — reserved for the parent's post-validation failure message (e.g. duplicate tag, transport error).
- **Template** — `DialogShell` → `v-card` → native `<form>` with `v-text-field` (tag, name, nativeName), `v-select` (direction), `v-switch` (active, create-only), and cancel/save buttons.

## Relationships

- **`src/modules/locales/schemas.ts`** — imports `localesLanguageSchema` and `localesLanguageEditSchema`; the two differ only in whether `tag` is required.
- **`src/modules/locales/views/LocalesList.vue`** — parent for the per-row edit dialog; passes a `language` prop and renders its own `InlineErrorAlert` into the `error` slot.
- **`src/modules/locales/views/LocalesDictionary.vue`** — parent for the "add language" dialog; passes no `language`, uses create mode.
- **`src/modules/locales/tests/form-dialogs.spec.ts`** — unit/integration specs covering validation, reset-on-open, and emit behavior.

## Notes

- **Two schemas, not one with a conditional rule.** A "sometimes-required" field is considered unreadable as a rule, so create and edit each get their own schema.
- **Reset on open, not on mount.** The dialog is a single reused instance per page; the `watch(isOpen)` guard prevents yesterday's values appearing in a fresh create.
- **`tag` is disabled on edit, not hidden.** It's what every other locale entry references, so the API keeps it immutable and the UI surfaces it read-only.
- **`active` switch is create-only.** Existing languages are toggled via dedicated board buttons (`POST …/activate` / `…/deactivate`), not through this form.
- **Submit button is never disabled on validity.** Invalid fields trigger inline error messages on submit rather than a greyed-out button, keeping the affordance discoverable.
- **`revalidateOn: locale`** — the form re-runs validation whenever the i18n locale changes, so translated error messages appear immediately.
- **No error handling of its own.** All save-side failures (duplicate tag, network) are the parent's responsibility; this dialog only handles *field-level* validation and exposes `applyServerErrors` for the parent to use.
