# src/modules/locales/components/EntryFormDialog.vue

## Purpose

A modal dialog for adding a single locale entry (tenant, key, value). It is purely presentational: it validates its fields against a Zod schema, resets them on every open, and emits the result upward via a `save` event. It never touches a store itself, so the parent page owns persistence.

## Key elements

- **Props** — `tenants: LocaleTenantDescriptor[]` (options for the tenant select) and `initialTenant?: string` (preselection from the page's active filter).
- **Emits** — `save(fields: { tenant, key, value })` fired after successful schema validation.
- **`isOpen` (v-model)** — two-way visibility binding via `defineModel<boolean>`.
- **`useStructureFormValidation`** — supplies `form`, `formErrors`, `showFormErrors`, `handleSubmit`, and `setForm`, validated against `localesEntrySchema`. Re-runs validation on `locale` change; on invalid submit dispatches a "fix errors" toast.
- **`watch(isOpen)`** — resets the form to defaults (`defaultTenant`, empty key/value) each time the dialog opens, preventing stale data from a previous session.
- **`tenantOptions`** — computed list mapping each tenant to `{ value: id, title: "label (id)" }` for the `v-select`.
- **`handleSave`** — calls `handleSubmit`; on success emits `save`, on failure shows inline field errors.
- **Template** — `v-dialog` (fullscreen on mobile, `max-width: 560` otherwise) containing a `v-select`, `v-text-field` (key, monospace), `v-textarea` (value, auto-grow), and Cancel / Save buttons. Save button is **never** `:disabled` — validation feedback is communicated through error messages instead.

## Relationships

No graph neighbors are recorded for this file. It imports from:

- `@guebbit/vue-toolkit` — `useStructureFormValidation`, `useNotificationsStore`
- `@/modules/locales/schemas.ts` — `localesEntrySchema` (Zod schema)
- `@/infrastructure/utils/errors.ts` — `VUETIFY_INVALID_FIELD_SELECTOR`
- `vue-i18n`, `vuetify`, `vue` — standard composables/directives

Its parent (the locales list page) supplies `tenants`, `initialTenant`, `v-model:isOpen`, and listens for `save`.

## Notes

- **Add-only by design.** The comment makes explicit that editing an existing entry happens inline in the table (key is immutable, value edited in place), so this dialog is never used for updates.
- **Reset-on-open, not on-mount.** The dialog is a single reused instance; the `watch(isOpen)` guard ensures yesterday's values never leak into the next open.
- **Save button is never disabled.** Pressing it with invalid fields triggers `handleSubmit`, which surfaces error messages and a toast — a UX choice documented in a template comment.
- **Accessibility:** the dialog heading carries a `useId()` so `aria-labelledby` references the title text rather than announcing a bare "dialog".
- **Mobile behavior:** `useDisplay().mobile` toggles `fullscreen` on the dialog so the form isn't cramped at a fixed `max-width` on narrow screens.
