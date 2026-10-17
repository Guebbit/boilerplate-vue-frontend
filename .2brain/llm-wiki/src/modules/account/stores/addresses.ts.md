---
source: src/modules/account/stores/addresses.ts
sha256: 67c51f0594b3b842e0db4b5eb80d2de15065eacdee9f9be0cd51ac612edcff58
generated_at: 2026-10-17T00:18:29.372559+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/stores/addresses.ts

## Purpose

Pinia store (Composition API) that owns the visitor's address-book state and all write actions against the address endpoints. It exists because the "exactly one default" invariant is a property of the whole list: any write that changes which entry is the default mutates a *different* row than the one the API responds with, so the store re-reads the full book after every mutation rather than patching a single entry locally.

## Key elements

- **`useAddressesStore`** — the store itself (`defineStore('accountAddresses', …)`). Exposes `addresses`, `loading`, and the five actions below.
- **`addresses: Ref<Address[]>`** — whole-list state; the single source of truth for rendering.
- **`fetchAddresses()`** — initial load; calls `apiListAddresses` and populates `addresses`.
- **`reloadBook()`** — internal re-read after a write; returns the updated list. Called inside the same `fetchAny` as the write so `loading` stays up and doesn't flicker.
- **`addAddress(address: AddressInput)`** — POST new entry, then reload. Server-side, the first entry auto-becomes default; `default: true` demotes the previous holder.
- **`updateAddress(addressId, changes)`** — PATCH one entry, then reload.
- **`setDefaultAddress(addressId)`** — `PUT …/default` (idempotent), then reload because the demoted holder is another row.
- **`removeAddress(addressId)`** — DELETE; reads the response payload directly (the delete endpoint returns the updated book) rather than issuing a second GET.
- **`readAddressesResponse(data: AddressesEnvelope)`** — typed helper that extracts `payload.addresses` via `getPayloadFromResponse`; typed against the generated envelope so a contract drift is a compile error.

## Relationships

- **`ProfileAddresses.vue`** — sole consumer that renders the store; the store is explicitly scoped to this page's lifecycle.
- **`AddressFormDialog.vue`** — calls `addAddress` / `updateAddress` when the user submits a new or edited entry.
- **`AddressPicker.vue`** — reads `addresses` from the store to present the selectable list.
- **`addresses.spec.ts`** — unit tests for the store's actions and state transitions.
- **`address-picker.spec.ts`** / **`profile-addresses-view.spec.ts`** — component tests that exercise the store in rendered context.

## Notes

- **No local patching.** Every write (add, update, setDefault) is followed by a full re-fetch. `removeAddress` is the one exception: it trusts the delete response payload instead of issuing a second GET, but the net effect is identical (whole-list replacement).
- **`loading` covers write + read together.** Because `reloadBook` runs inside the same `fetchAny` callback as the mutation, the loading indicator never drops between the write completing and the re-read finishing.
- **Typed envelope, not `unknown`.** `readAddressesResponse` is typed against `AddressesEnvelope` / `AddressesResponse`, so if the API contract changes the call site fails at compile time rather than silently producing `undefined`.
- **Scoped, not global.** The store is tied to the profile page (`ProfileAddresses.vue`), not to a session or a single editable record. Do not lift it into a broader layout without re-evaluating the scoping rationale in the JSDoc.
