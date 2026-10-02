---
source: src/modules/account/components/ProfileAddresses.vue
sha256: c35b1d636920154e1dff6d815c5a2800c377e35e8e71a5125611a16781997d39
generated_at: 2026-10-02T12:10:09.145037+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAddresses.vue

## Purpose

Address-book panel for the profile page. Renders the visitor's saved addresses in a responsive card grid and provides per-entry actions (set default, edit, remove) plus an add button. All writes go through the addresses store, which fetches the full list after each mutation so the UI always reflects the server's single-default invariant.

## Key elements

- **`dialogOpen` / `editing`** – Reactive refs controlling the shared `AddressFormDialog`; `editing` is `undefined` for add, an `Address` for edit.
- **`openAdd` / `openEdit`** – Set the refs above and flip `dialogOpen` to `true`.
- **`handleMakeDefault(address)`** – Calls `setDefaultAddress` from the store; on failure reports into the shared `rowActionError` slot.
- **`handleRemove(address)`** – Asks `useDialogStore().confirm(…)` first, then calls `removeAddress`; success is toasted via `useNotificationsStore`, failure lands in the same `rowActionError` slot.
- **`rowActionError` (from `useBlockingError`)** – Single shared error state for the two row actions (make-default, remove) that have no per-button control; rendered as an `InlineErrorAlert` above the list.
- **`onMounted(fetchAddresses)`** – Initial data load; after every store mutation the API re-fetches the whole list.
- **Template** – `v-card` container with a header row (title + add button), optional `InlineErrorAlert`, empty-state paragraph, and a `grid gap-3 sm:grid-cols-2` of address cards, each showing label, name, street, zip/city/country, optional phone, and three action buttons.

## Relationships

- **`src/modules/account/components/AddressFormDialog.vue`** – Imported and rendered at the bottom of the template with `v-model="dialogOpen"` and `:editing="editing"`. This component is the single save-path for both add and edit; the panel itself contains no form logic.
- **`src/infrastructure/utils/logger.ts`** – Transitive dependency (reached through store or toolkit imports); not directly imported or referenced in this file.

## Notes

- The "exactly one default" invariant is a *list-level* property, which is why every write triggers a full-list refetch rather than patching a single row locally.
- `rowActionError` is deliberately shared between make-default and remove because neither action has its own persistent control; the list stays interactive while the alert is visible.
- The edit and remove buttons use **named** aria-labels (`addresses-edit-named`, `addresses-remove-named`) so each row's buttons are distinguishable to screen readers in a grid of identical labels.
- The store import path uses a `.ts` extension (`@/modules/account/stores/addresses.ts`), consistent with the project's explicit-extension convention for ESM imports.
