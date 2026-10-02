---
source: src/modules/locales/components/EntryFormDialog.vue
sha256: c713708adc429a3a3a3c9035829544a025664092d0b95e77b03b03ee9d238aeb
generated_at: 2026-10-02T15:12:07.829582+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntryFormDialog.vue

## Purpose

A modal dialog for **adding** a single locale entry (tenant + key + value). It collects and schema-validates the three fields, then emits the clean result upward; all persistence, error display, and store access live in the parent. Editing existing entries happens inline in the table and never passes through this component.

## Key elements

- **`props`** — `tenants` (registry list for the tenant select), `initialTenant` (pre-select from the page filter), `saving` (disables submit while the parent's write is in flight to prevent double-send).
- **`isOpen` (defineModel)** — two-way `v-model` boolean controlling dialog visibility; the dialog neither declares the prop nor re-emits `update:modelValue` manually.
- **`emit('save', { tenant, key, value })`** — the sole outward communication; the parent handles the API call and any resulting errors.
- **`useStructureFormValidation`** — validates against `localesEntrySchema` (from `@/modules/locales/schemas.ts`); re-validates on `locale` change; exposes `handleSubmit`, `formErrors`, `showFormErrors`, `setForm`, `applyServerErrors`.
- **`watch(isOpen)`** — resets all three fields to defaults on every open so a reused dialog instance never leaks stale values.
- **`defineExpose({ applyServerErrors })`** — lets the parent push a server-rejected field (e.g. duplicate key) onto the matching form field after this form already validated clean.
- **`<slot name="error" />`** — the parent renders its own `InlineErrorAlert` (or equivalent) here, above the buttons, because this dialog has no opinion on what a blocked save looks like.
- **Composables** — `useFullscreenDialog` (mobile), `useReturnFocus` (restore focus on close), `useId` (accessible `aria-labelledby`).

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** — listed as a graph neighbor; no direct import, shared state, or event link is visible in this file's source. The connection is most likely indirect (e.g. both mounted under the same parent view or route), but no interaction can be confirmed from this component alone.

## Notes

- The save button is **never disabled for invalidity** — clicking it triggers `handleSubmit`, which surfaces the field errors and fires a "fix the errors" toast. Disabling it would hide *why* the form is wrong.
- `saving` is the only condition that disables the button, guarding against Enter-key or double-click duplicate writes.
- The dialog is a **single reusable instance** on the page; the `watch(isOpen)` reset (not a mount hook) is what guarantees clean state across opens.
- `data-test` attributes (`entry-form`, `entry-tenant`, `entry-key`, `entry-value`, `entry-save`) are present for E2E selectors.
- `VUETIFY_INVALID_FIELD_SELECTOR` is passed into the validator so it can scroll/focus the first invalid Vuetify field automatically.
