---
source: src/modules/account/components/ProfileAddresses.vue
sha256: 834150a84c37bb1d064729fab8b866a1705acd0c45ea14c18b68d292f6fe2142
signature: 834150a84c37bb1d064729fab8b866a1705acd0c45ea14c18b68d292f6fe2142
generated_at: 2026-11-10T03:19:56.122920+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAddresses.vue

## Purpose

Address-book panel for the Profile page. Renders the visitor's saved addresses in a card grid and provides add, edit, set-default, and remove actions. All mutations go through the Pinia store, which re-fetches the full list after each write so the "exactly one default" invariant is always reflected from the server's answer.

## Key elements

- **`openAdd` / `openEdit`** — Open `AddressFormDialog` in create or edit mode respectively (sets the `editing` ref).
- **`handleMakeDefault`** — Calls `setDefaultAddress(id)` from the store; on failure sets the shared `rowActionError`.
- **`handleRemove`** — Wrapped in `singleFlight`; prompts a destructive confirmation via `useDialogStore().confirm`, then calls `removeAddress(id)`. Success is toasted; failure sets `rowActionError`.
- **`rowActionError` / `reportRowActionError` / `clearRowActionError`** — Single `useBlockingError` instance shared by both set-default and remove, rendered as one `InlineErrorAlert` above the list (neither action has its own inline control).
- **`dialogOpen` / `editing`** — Reactive state driving `AddressFormDialog` (v-model + `:editing`).
- **`onMounted(fetchAddresses)`** — Initial load of the address list.

## Relationships

- **`src/modules/account/components/AddressFormDialog.vue`** — Child dialog; receives `v-model="dialogOpen"` and `:editing`. One shared form for both create and edit, eliminating a duplicate save path.
- **`src/modules/account/stores/addresses.ts`** — Source of `addresses` (reactive list) and all write actions (`fetchAddresses`, `setDefaultAddress`, `removeAddress`). The component never mutates the list directly.
- **`src/modules/account/views/Profile.vue`** — Parent view that embeds this component.
- **`src/modules/account/tests/profile-addresses-view.spec.ts`** — Asserts rendering, empty-state, and per-address UI.
- **`src/modules/account/tests/profile-addresses-default.spec.ts`** — Asserts the set-default flow and "exactly one default" display.
- **`src/modules/account/tests/confirm-once.spec.ts`** — Verifies the `singleFlight` guard on removal (double-click protection).
- **`src/infrastructure/utils/logger.ts`** — Appears in the dependency graph but is **not** directly imported by this file.

## Notes

- The component intentionally does **not** track per-row loading/error state for set-default and remove; both share the single `rowActionError` slot above the list. This mirrors the pattern in `products/ProductsList.vue` (see `docs/theory/request-flow.md`).
- `handleRemove` is wrapped in `singleFlight` to collapse rapid duplicate clicks into one in-flight confirm+delete sequence.
- The `name: 'ProfileAddresses'` block exists only so `<KeepAlive>` and devtools can identify the SFC (not possible with `<script setup>` alone).
- `formatCountry` (from `@/infrastructure/utils/formatters.ts`) is used for display.
