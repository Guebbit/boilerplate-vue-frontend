---
source: src/modules/account/stores/addresses.ts
sha256: 3ee49c8c56e57f3b65a32d4a81fc4696647c40357b006c27587e8a3525e19fcb
generated_at: 2026-10-02T12:16:52.646236+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/addresses.ts

## Purpose

Pinia store (Composition API) managing the visitor's address book. Every mutation (add, update, set-default, remove) re-fetches the entire book rather than patching a single entry, because the invariant that must hold after any write — exactly one default — is a list-level property that can shift a *different* row than the one the API responds with.

## Key elements

- **`useAddressesStore`** — the exported store (`'accountAddresses'`). Returns `addresses`, `loading`, and four actions plus `fetchAddresses`.
- **`addresses`** — `ref<Address[]>`; whole-list state, the single source of truth for rendering.
- **`fetchAny` / `loading`** — from `useStructureRestApi<Address, string>`; every action routes through `fetchAny` so the loading flag stays up for the full write-then-read sequence without flickering.
- **`readAddressesResponse(data: AddressesEnvelope)`** — unwraps the generated envelope via `getPayloadFromResponse` and replaces `addresses`. Typed against `AddressesEnvelope` so a contract break is a compile error, not a runtime cast.
- **`fetchAddresses()`** — initial load; calls `apiGetAddresses` inside `fetchAny`.
- **`reloadBook()`** — internal re-fetch after a write; called *inside* the write's `fetchAny` so `loading` spans both steps.
- **`addAddress(address)`** — POST then reload; the first entry becomes default server-side, demoting the previous holder (a different row).
- **`updateAddress(addressId, changes)`** — PATCH (AUDIT_0924 D17d) then reload.
- **`setDefaultAddress(addressId)`** — PUT `{addressId}/default` (idempotent) then reload; the demoted holder is another row.
- **`removeAddress(addressId)`** — DELETE; the response carries the updated book directly (server promotes the oldest survivor to default if the removed entry was default).

## Relationships

- **`src/modules/account/components/AddressPicker.vue`** — consumer of this store; reads `addresses` and `loading`, and calls the store's actions to create, edit, re-order (set default), and delete entries.

## Notes

- The store is deliberately scoped to the profile page context, not the session. Do not import it into a global layout or a separate editable-record view.
- `removeAddress` is the only action that reads the response payload directly (`readAddressesResponse(data)`); all other actions discard the single-entry response and call `reloadBook()`. This asymmetry is intentional: the delete endpoint returns the updated book, while the others return only the mutated row.
- `setDefaultAddress` is idempotent per the API contract; calling it with the already-default ID is a safe no-op (still triggers a reload).
- The `resourceKey` (`'accountAddresses'`) must match any external query-cache invalidation keys that reference this slice.
