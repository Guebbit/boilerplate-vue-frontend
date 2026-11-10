---
source: src/modules/account/stores/addresses.ts
sha256: da67b1209d949af57be145c04a0ee0268a857b818fc935709277e29b72bc9e80
signature: 844ff1aea69f469b6bc3be3415e0a341b6b34492e28c73d1fd51e45d8ba2e81f
generated_at: 2026-11-10T03:26:06.005305+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/addresses.ts

## Purpose

Pinia store (Composition API) that owns the visitor's address book. Every write action re-fetches the entire list rather than patching a single row, because the invariant the UI must render — exactly one default address — is a property of the whole list, and a write (create, set-default, delete) can change a row other than the one the API returns.

## Key elements

- **`useAccountAddressesStore`** — the exported Pinia store (`account-addresses`). Exposes `addresses`, `loading`, and four write actions plus `fetchAddresses`.
- **`addresses: Ref<Address[]>`** — whole-list state. Replaced wholesale after every read.
- **`loading`** — from `useStructureRestApi`; stays elevated for the full write-then-read cycle (no flicker between the mutation and the re-fetch).
- **`fetchAddresses()`** — initial load; calls `apiListAddresses` and assigns the result.
- **`addAddress(address)`** — creates an entry via `apiCreateAddress`, guarded by an idempotency key derived from the payload; then `reloadBook()`.
- **`updateAddress(addressId, changes)`** — PATCHes one entry; then `reloadBook()`.
- **`setDefaultAddress(addressId)`** — `PUT /account/addresses/{id}/default`; then `reloadBook()`.
- **`removeAddress(addressId)`** — DELETE (204); then `reloadBook()`.
- **`reloadBook()`** (internal) — re-lists the book and updates `addresses`. Called inside each write's `fetchAny` so `loading` covers both phases.
- **`readAddressesResponse(data)`** (internal) — typed against `AddressesResponse`; assigns `data.addresses` to state.
- **`addressIdempotencyKeys`** — `useIdempotencyKeys()` instance; `forSubject(JSON.stringify(address))` mints/reuses a key so a retried create never produces a duplicate.

## Relationships

- **`ProfileAddresses.vue`** — sole renderer of the store; scoped to this component per the module doc.
- **`AddressFormDialog.vue`** — consumes `addAddress` / `updateAddress` to create or edit an entry.
- **`AddressPicker.vue`** — reads `addresses` to present the book for selection.
- **`addresses.spec.ts`** — unit tests for the store's actions and state transitions.
- **`address-picker.spec.ts`** — exercises the picker against the store's `addresses` state.
- **`profile-addresses-view.spec.ts`** — component-level tests for `ProfileAddresses.vue` consuming the store.
- **`confirm-once.spec.ts`** — tests the one-time confirmation guard on destructive store actions.

## Notes

- The store deliberately avoids optimistic single-row updates. Do not "optimise" a write into a local splice; the default-slot demotion/promotion is server-authoritative and may touch an arbitrary other row.
- Idempotency is applied only to `addAddress`. The other writes are inherently idempotent (PATCH/PUT/DELETE by ID) or use server-side caps; no key is generated for them.
- `loading` is a shared flag from `useStructureRestApi`. Because `reloadBook` runs *inside* the same `fetchAny` callback, the flag never dips between mutation and re-fetch — important if UI disables buttons on `loading`.
- The store is intentionally not session-scoped; its lifecycle is tied to `ProfileAddresses.vue` mounting/unmounting.
