# src/modules/account/stores/addresses.ts

## Purpose

Pinia store (Composition API) that owns the visitor's address-book state and exposes CRUD actions. Every write operation re-fetches the full list from the API response envelope rather than patching a single entry, because the invariant the UI must render — exactly one default address — is a list-level property.

## Key elements

- **`useAddressesStore`** — The Pinia store (`'accountAddresses'`). Returns `addresses`, `loading`, and the four action functions.
- **`addresses`** — `ref<Address[]>` holding the current book. Replaced wholesale on every successful response.
- **`readAddressesResponse(data: AddressesEnvelope)`** — Unwraps the generated envelope via `getPayloadFromResponse<AddressesResponse>` and assigns `payload?.addresses ?? []` to the local ref. Typed against the envelope contract so a shape change is a compile error.
- **`fetchAddresses()`** — Calls `apiGetAddresses()`, pipes the result through `readAddressesResponse`, wrapped in `fetchAny` for loading-state management.
- **`addAddress(address: AddressInput)`** — POSTs a new entry; the first one becomes default server-side.
- **`updateAddress(addressId, changes)`** — PATCHes a single entry; `default: true` claims the slot, absent leaves it.
- **`removeAddress(addressId)`** — DELETEs an entry; the server promotes the oldest survivor to default if the removed one was default.

All four actions follow the same pattern: `fetchAny(() => apiX(...).then(readAddressesResponse))`.

## Relationships

- **`docs/index.md`** — Listed as a dependency-graph neighbor; likely references or documents this store in the wiki's top-level index. No runtime import exists in either direction.
- Consumes `@guebbit/vue-toolkit` (`useCoreStore`, `useStructureRestApi`) for shared loading state and the `fetchAny` helper.
- Consumes `@api` (`getAddresses`, `addAddress`, `updateAddress`, `removeAddress`) for the HTTP layer.
- Consumes `@/infrastructure/http/envelope.ts` (`getPayloadFromResponse`) to decode the standard response envelope.
- Consumes `@types` for `Address`, `AddressesEnvelope`, `AddressesResponse`, `AddressInput`, `UpdateAddressRequest`.
- Scoped to `ProfileAddresses.vue`, the sole rendering component.

## Notes

- The store is deliberately **whole-list**: after any mutation the UI re-reads the full array. Do not add optimistic single-item patches without re-evaluating the "exactly one default" invariant.
- `readAddressesResponse` is intentionally typed as `AddressesEnvelope` (not `unknown`) so that a server contract drift breaks the build at the four call sites rather than silently producing `undefined` at runtime.
- Loading state is delegated to the shared `useCoreStore` / `useStructureRestApi` pair; there is no local `isLoading` flag.
- The store is **not** session-scoped or record-scoped — it lives on the profile page, matching the domain model that "a book belongs to the profile."
