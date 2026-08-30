# src/modules/locales/components/EntryFormDialog.vue

## Purpose

A "add one entry" dialog for the locales module. It presents a schema-validated three-field form (tenant, key, value), resets itself on every open, and emits the resulting fields upward via a `save` event. It performs no store access and no API calls of its own — the parent page owns persistence. It exists because stored entries have immutable keys and are edited inline in the table, so the only path back through a dialog is creation.

## Key elements

- **Props** — `tenants: LocaleTenantDescriptor[]` (the full tenant list from the API registry, drives the select) and optional `initialTenant?: string` (preselect matching the page's current filter).
- **`defineModel<boolean>` (`isOpen`)** — two-way v-model for dialog visibility; the component neither declares a `modelValue` prop nor emits `update:modelValue` by hand.
- **`defaultTenant`** (computed) — resolution order: `initialTenant` → first tenant in the list → `''`.
- **`useAppForm`** call — creates a reactive `form` object (`{tenant, key, value}`), `formErrors`, `showFormErrors`, `handleSubmit`, and `setForm`, all validated against `localesEntrySchema`.
- **`watch(isOpen, …)`** — on every open, calls `setForm` to reset fields to defaults. Ensures a reused single-instance dialog never leaks a previous entry's values.
- **`tenantOptions`** (computed) — maps the `tenants` prop into `{ value, title }` pairs for the `v-select`.
- **`handleSave`** — delegates to `handleSubmit`; on success emits `save` with the three fields, on failure the composable surfaces errors.
- **`titleId`** (`useId()`) — bound to `<h2>` and to `v-dialog`'s `aria-labelledby` so screen readers announce the title.
- **Template** — Vuetify `v-dialog` → `v-card` containing a `<form>` with `v-select` (tenant), `v-text-field` (key, monospace), `v-textarea` (value, auto-grow), and Cancel / Save buttons. Error messages are shown only when `showFormErrors` is true.

## Relationships

No graph neighbors are recorded for this file. It imports from `@/infrastructure/composables/use-app-form.ts` and `@/modules/locales/schemas.ts`, and consumes the `LocaleTenantDescriptor` type from `@types`, but no reverse-edge or peer files are listed in the dependency graph.

## Notes

- **Save button is never `:disabled`.** Deliberate UX choice: an unpressable button gives no feedback, whereas `handleSubmit` triggers `showFormErrors` and the field-level `error-messages` explain what's wrong.
- **Single-instance reuse.** The page mounts one dialog and re-opens it; the `watch(isOpen)` reset is what prevents stale values. There is no keying or remounting.
- **Add-only.** The doc comment and prop design make clear this dialog never receives an existing entry to pre-fill. Inline table edits handle updates.
- **`novalidate` on `<form>`.** Validation is entirely delegated to `useAppForm` / Zod; native browser constraint UI is suppressed.
