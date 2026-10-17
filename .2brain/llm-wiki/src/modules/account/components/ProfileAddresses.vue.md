---
source: src/modules/account/components/ProfileAddresses.vue
sha256: c856f20e8da15471c4ee3ac91fc41742340d983de315384195b107d5a69f9f5b
generated_at: 2026-10-17T00:15:25.364728+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAddresses.vue

## Purpose

Vue SFC that renders the address-book panel inside the profile view. It lists the visitor's saved addresses in a responsive card grid, provides add / edit / remove / set-default actions, and delegates the add & edit form to `AddressFormDialog`. Every write action triggers a full list re-fetch so the "exactly one default" invariant is always reflected from the API's authoritative response.

## Key elements

- **`openAdd()` / `openEdit(address)`** – Open the `AddressFormDialog` in add or edit mode respectively; `editing` ref is `undefined` for add, an `Address` object for edit.
- **`handleMakeDefault(address)`** – Calls `setDefaultAddress` from the addresses store; on failure reports into the shared `rowActionError` state.
- **`handleRemove(address)`** – Shows a confirmation dialog (`useDialogStore().confirm`), then calls `removeAddress`; success is toasted, failure reported to `rowActionError`.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** – Shared blocking-error pair (from `useBlockingError`) rendered as an `InlineErrorAlert` above the list; both row actions (set-default, remove) funnel into it since neither has its own inline control.
- **`dialogOpen` / `editing`** – Reactive refs controlling the dialog's open state and which record (if any) it edits.
- **`onMounted(fetchAddresses)`** – Initial data load when the panel mounts.
- **Template** – `v-card` container with a header ("Add" button), optional `InlineErrorAlert`, empty-state paragraph, and a `v-for` grid of address cards each showing label, name, street, postal line, phone, a "Default" chip, and three action buttons (make-default, edit, remove). All interactive elements carry `data-test` attributes.

## Relationships

- **`src/modules/account/stores/addresses.ts`** – Primary data source. The component pulls `fetchAddresses`, `setDefaultAddress`, `removeAddress` actions and the reactive `addresses` array from this Pinia store.
- **`src/modules/account/components/AddressFormDialog.vue`** – Child dialog rendered at the bottom of the template; receives `v-model` for open state and `:editing` for the record being modified. Shared with `AddressPicker` so there is one form / one save path.
- **`src/modules/account/views/Profile.vue`** – Parent view that mounts this panel as part of the profile page layout.
- **`src/modules/account/tests/profile-addresses-default.spec.ts`** – Unit tests exercising the set-default flow against this component.
- **`src/modules/account/tests/profile-addresses-view.spec.ts`** – Unit tests covering the list rendering, empty state, and action-button behaviour.

## Notes

- **Dual script blocks:** A plain `<script>` exports only `name: 'ProfileAddresses'` (required for `<KeepAlive>` and devtools since `<script setup>` cannot declare a component name). All logic lives in `<script setup>`.
- **Shared error channel:** `rowActionError` intentionally covers both "make default" and "remove" because neither action owns a dedicated input control on the page — a single alert above the grid is the one place a failure belongs (same pattern as `ProductsList.vue`).
- **`editing` semantics:** `undefined` = add mode; a populated `Address` = edit mode. The dialog checks this to decide whether to prefill fields.
- **Full-list re-render:** The component never optimistically updates a single row. After any mutation the store re-fetches and the template re-renders from the new array, ensuring the "exactly one default" invariant is always API-authoritative.
- **Accessibility:** Edit and remove buttons use per-entry `aria-label`s (`addresses-edit-named`, `addresses-remove-named`) so a list of identical "Edit" buttons is not ambiguous to screen readers.
