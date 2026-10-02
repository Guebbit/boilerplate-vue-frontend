---
source: src/modules/account/components/AddressPicker.vue
sha256: 7d044d6c1c56ceeee5c7d32af1cbcdab4bcd16442961dff46ebb2f0c0d7a06db
generated_at: 2026-10-02T14:44:39.810583+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressPicker.vue

## Purpose

Radio-group picker for choosing a saved address during checkout. `ShippingSelector.vue` mounts two instances — one for the shipping address, one for the billing address — and binds each to a `defineModel` slot holding the selected entry's id (or `undefined`). Includes an "add address" button that opens the shared `AddressFormDialog`.

## Key elements

- **`addressId`** (`defineModel<string | undefined>`) — two-way binding; the parent reads/writes the chosen entry id.
- **`SAME_AS_SHIPPING`** — sentinel radio value (`'same-as-shipping'`) used only when the `sameAsShipping` prop is set; mapped back to `undefined` in the model, never sent to the API.
- **Props** — `purpose` (`'shipping' | 'billing'`), `sameAsShipping` (offers the "same as shipping" radio), `shipToCountries` (narrowed country list forwarded to the dialog).
- **`prefix` / `copy`** (computed) — per-purpose `data-test` prefix and i18n strings; spelled out key-by-key for locale-file searchability.
- **`choice`** (computed) — bridges `addressId` to the radio group's value, handling the `SAME_AS_SHIPPING` sentinel.
- **`addingHere`** (plain `let`, non-reactive) — flags that the add-address dialog was opened by *this* picker so the `watch(addresses)` can attribute a new entry to the correct picker.
- **`watch(addresses)`** — reconciliation: picks a newly-added entry (if from this dialog), clears a stale choice when the book loads empty, or falls back to the `default` entry / first entry. `immediate: true`.
- **`watch(sameAsShipping)`** — sets the model to `undefined` (choosing "same") when the option appears; restores a valid entry when it disappears.
- **`onMounted`** — calls `addressesStore.fetchAddresses()` if the book is empty.

## Relationships

- **`AddressFormDialog.vue`** — rendered inside this component; receives `dialogOpen` via `v-model` and the `shipToCountries` prop. The dialog is the profile page's own add-address form, reused here.
- **`stores/addresses.ts`** — `useAddressesStore()` provides the shared `addresses` array (via `storeToRefs`) and the `fetchAddresses()` action. Because the store is shared with the profile page, an address added at checkout appears there immediately.
- **`account/index.ts`** — module barrel; this component is part of the `account` module's public surface alongside its siblings.

## Notes

- Two `AddressPicker` instances share one address book. The `addingHere` flag (a plain variable, deliberately non-reactive) is the mechanism that prevents a new entry saved through billing's dialog from being auto-selected by shipping's picker, and vice versa.
- `addingHere` is reset in a `nextTick` after the dialog closes, giving the `watch(addresses)` callback a chance to run first.
- The `watch(addresses)` empty-list branch checks `previous !== undefined` to distinguish "book loaded empty" from "initial read not yet returned," avoiding clearing a valid restored choice on first mount.
- `data-test` ids use the `prefix` (e.g. `address-picker-…` vs `billing-address-picker-…`) so the two instances are distinguishable in E2E tests despite sharing markup.
