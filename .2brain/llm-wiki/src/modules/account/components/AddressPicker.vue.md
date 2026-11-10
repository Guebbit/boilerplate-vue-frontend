---
source: src/modules/account/components/AddressPicker.vue
sha256: c752f6c6f2a1f1ad684e1b7b80e94dc974f0d2798f803dbaefc9f2d808ea1527
signature: c752f6c6f2a1f1ad684e1b7b80e94dc974f0d2798f803dbaefc9f2d808ea1527
generated_at: 2026-11-10T03:18:50.602596+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/AddressPicker.vue

## Purpose

A radio-group picker for choosing one saved address from the visitor's address book during checkout. Checkout mounts two instances (one for shipping, one for billing) that share the same Pinia address store but must never cross-select. The component exposes its selection through `defineModel<string | undefined>` and includes an embedded "add address" dialog so a visitor can save a new address without leaving checkout.

## Key elements

- **`SAME_AS_SHIPPING`** – String sentinel (`'same-as-shipping'`) used as the radio value for "same as shipping"; never a real entry id and never sent to the API. The `choice` computed maps it to `undefined` on the model.
- **`addressId`** (`defineModel<string | undefined>`) – The two-way binding the parent reads/writes. `undefined` is a valid, meaningful value when `sameAsShipping` is on.
- **`purpose`** (`'shipping' | 'billing'`) – Prop that drives the i18n key set, the `data-test` prefix, and the title. The two pickers share markup but not copy or test ids.
- **`sameAsShipping`** (`boolean`) – When true, inserts a "same as shipping" radio at the top and makes `undefined` the standing default choice.
- **`shipToCountries`** (`string[]`) – Forwarded verbatim to `AddressFormDialog` to restrict the country select to deliverable countries.
- **`choice`** (computed get/set) – Bridges `addressId` and `SAME_AS_SHIPPING`: get falls back to the sentinel when the model is `undefined` and `sameAsShipping` is set; set reverses the mapping.
- **`addingHere`** (plain `let`, not a ref) – Flag set true when this picker's dialog opens, reset in a `nextTick` after it closes. Prevents a new address saved by one picker from being auto-selected as the other picker's choice.
- **`watch(addresses, …, { immediate: true })`** – Maintains a valid selection as the list changes: auto-selects an entry just added from this picker's dialog, clears a stale id if the book loads empty, and falls back to the `default` entry (or first) when nothing valid is chosen. Never overrides a still-valid manual choice.
- **`watch(() => sameAsShipping, …)`** – When the option appears, resets the model to `undefined` (selecting "same as shipping"); when it disappears and nothing else is chosen, falls back to the default/first entry.
- **`onMounted`** – Fetches addresses from the store if the list is empty at mount; errors surface via `useAmbientError`.

## Relationships

- **`src/modules/account/components/AddressFormDialog.vue`** – Child component rendered inside the picker for adding a new address. Receives `shipToCountries` and a `v-model` for open/close state. The dialog's save action triggers the `addresses` watcher in this picker.
- **`src/modules/account/stores/addresses.ts`** (`useAccountAddressesStore`) – Shared Pinia store providing the reactive `addresses` array and the `fetchAddresses` action. Both checkout pickers and the profile page read/write the same store.
- **`src/modules/account/index.ts`** – Module barrel that re-exports this component for consumers.
- **`src/modules/account/tests/address-picker.spec.ts`** – Unit tests covering the selection, fallback, and cross-picker isolation logic.

## Notes

- Two `AddressPicker` instances on the same page share one store. The `addingHere` flag (a plain mutable, not a `ref`) is the sole mechanism that scopes a dialog save to the picker that opened it. It is reset in a `nextTick` after `dialogOpen` becomes false, specifically so the `addresses` watcher (which runs synchronously on the store update) has already executed before the flag is cleared.
- `SAME_AS_SHIPPING` is intentionally a string that cannot collide with a real 24-char hex id. It exists only in the DOM (radio value); the model always sees `undefined`.
- The i18n `copy` computed spells out both key sets explicitly rather than deriving the key from `prefix`, so a search for the literal key name in locale files will always match.
- The component's shape mirrors `ShippingSelector.vue` (noted in the module docblock), but they are independent components.
- `v-radio-group` is hidden when the book is empty **and** `sameAsShipping` is off; an empty-state `<p>` is shown instead. The "Add" button is always visible regardless.
