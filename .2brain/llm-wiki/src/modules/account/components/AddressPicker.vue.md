---
source: src/modules/account/components/AddressPicker.vue
sha256: 6581817e6b8414e9974eec658254e75d009b94637207a9d58d2ae5ecbffd4ca0
generated_at: 2026-10-17T00:14:48.014201+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressPicker.vue

## Purpose

A radio-group picker for choosing a saved address (shipping or billing) during checkout. It renders one radio per entry in the shared address book, supports an optional "same as shipping" choice, and lets the visitor add a new address inline via `AddressFormDialog`. Mounted twice by `ShippingSelector.vue` (or `Cart.vue`) — once per `purpose` — so a new address saved through one picker is never accidentally adopted by the other.

## Key elements

- **`SAME_AS_SHIPPING`** (`'same-as-shipping'`) — sentinel radio value that maps to `addressId = undefined` in the model; never sent to the API.
- **`addressId`** (`defineModel<string | undefined>`) — two-way binding for the selected entry id; `undefined` means "no specific entry" (or "same as shipping" when `sameAsShipping` is on).
- **Props** — `purpose` (`'shipping' | 'billing'`, default `'shipping'`), `sameAsShipping` (bool, shows the sentinel radio and makes it the default), `shipToCountries` (string[], forwarded to the add dialog to restrict the country select).
- **`copy`** (computed) — per-purpose i18n keys for title, empty-state, and add-button text; spelled out per key so missing translations are greppable.
- **`choice`** (computed get/set) — bridges `addressId` to the radio group, translating `undefined` ↔ `SAME_AS_SHIPPING`.
- **`addingHere`** (local mutable flag) — set to `true` when this picker's dialog opens, reset on `nextTick` after it closes; prevents a new address saved here from being auto-selected by the *other* picker's watcher.
- **`watch(addresses, …)`** (immediate) — auto-selects a newly added entry (from this picker's dialog), clears a stale choice when the book loads empty, and falls back to the `default` (or first) entry otherwise.
- **`watch(sameAsShipping, …)`** — when the option appears it becomes the choice; when it disappears the choice falls back to the default/first entry.
- **`onMounted`** — fetches addresses from the store if the book is still empty.

## Relationships

- **`AddressFormDialog.vue`** — imported and rendered in the template; receives `dialogOpen` via `v-model` and `shipToCountries` as a prop. The dialog is the shared add-address UI; this picker does not implement address editing itself.
- **`stores/addresses.ts`** (`useAddressesStore`) — provides the reactive `addresses` list via `storeToRefs`; called for `fetchAddresses()` on mount if the list is empty.
- **`src/modules/account/index.ts`** — barrel/re-export module; this component is consumed downstream (e.g., by `ShippingSelector.vue` / `Cart.vue`) through that export surface.
- **`tests/address-picker.spec.ts`** — unit tests exercising this component's selection logic, `sameAsShipping` behavior, and the cross-picker isolation (`addingHere`) guard.

## Notes

- The `<script>` (options) block exists solely to declare `name: 'AddressPicker'`; `<script setup>` cannot set a component name.
- `purpose` affects the `data-test` prefix (`address-picker` vs `billing-address-picker`) and the i18n keys, but the two pickers share identical markup structure — tests should target the prefix, not the `purpose` prop, to disambiguate.
- The "same as shipping" sentinel is intentionally **not** a valid entry id (real ids are 24-char hex) and is **not** persisted; the model stays `undefined` when it is selected.
- `shipToCountries` is a pass-through: it narrows the country dropdown in the add dialog but has no effect on the picker's own radio list.
- The `watch(addresses, …)` guard `previous !== undefined` distinguishes "book loaded empty" from "book not yet fetched" (initial `undefined` → `[]` transition is a no-op).
