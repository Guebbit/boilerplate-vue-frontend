---
source: src/modules/inventory/components/StockMovementForm.vue
sha256: f502687d5f7bcdff99132ba72c1b654213ec161e27cb1d771b51e22793432dc1
signature: f502687d5f7bcdff99132ba72c1b654213ec161e27cb1d771b51e22793432dc1
generated_at: 2026-11-10T04:31:21.152560+00:00
model: ollama:qwen3.8:27b
---

# src/modules/inventory/components/StockMovementForm.vue

## Purpose

A Vuetify form for writing to inventory counters in two modes — **receipt** (strictly-positive delivery) and **adjustment** (signed delta, e.g. shrinkage). It is instantiated twice (once per mode) rather than as a single form with a runtime sign toggle, so a mis-click cannot convert one transition into the other. All field state, validation, and submit gating are delegated to `useStructureFormValidation` with a mode-branching Zod schema.

## Key elements

- **`props.mode`** (`'receipt' | 'adjust'`) — drives schema shape, default amount sign, labels, colors, and `data-test` values.
- **`schema`** (computed Zod object) — `productId` (required string), `amount` (positive int for receipt; non-zero signed int for adjust), `note` (free text).
- **`useStructureFormValidation`** — owns `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `applyServerErrors`; revalidates on `locale` change.
- **`useProductPicker` / `useProductPickerPin`** — server-driven product search (`POST /products/search`) and pinning of the currently selected product so it survives subsequent searches.
- **`useBlockingError`** — captures unmapped submit errors (notably the 409 "would leave fewer units than reserved") and exposes `message` / `report` / `clear` for inline display.
- **`submitForm`** — clears prior inline error, dispatches to the inventory store's receipt or adjust action, toasts the resulting availability level, clears `note`, calls `invalidateProductsCache()` (fire-and-forget), and routes server errors to field-level or inline display.
- **Template** — `v-autocomplete` (with `no-filter`; server already filters), `v-text-field` for amount/delta, `v-text-field` for note, submit `v-btn` bound to the store's loading ref, and `InlineErrorAlert` for the blocking error.

## Relationships

- **`src/modules/inventory/store.ts`** — provides the inventory store via `useInventoryStore`; the form dispatches its write through the store and reads the store's loading ref to disable the submit button while a request is in flight.
- **`src/modules/inventory/composables/use-product-picker.ts`** — supplies `useProductPicker` (query + options for the `v-autocomplete`) and `useProductPickerPin` (keeps the selected product in the options list across subsequent searches).
- **`src/modules/inventory/views/InventoryLedger.vue`** — parent view that instantiates this component twice, once with `mode="receipt"` and once with `mode="adjust"`.
- **`src/modules/inventory/tests/stock-movement-form.spec.ts`** — component/unit tests covering this form's validation and submit behavior.

## Notes

- The `<form>` uses `novalidate`; all validation is Zod-driven via `useStructureFormValidation`. Browser-native validation is intentionally bypassed.
- After a successful write, `invalidateProductsCache()` is called but its failure is swallowed — a failed refetch does not undo the write.
- The 409 response (adjustment would leave fewer units than are already reserved to orders) has no mappable field, so it surfaces as an inline `InlineErrorAlert` beneath the submit button rather than as a toast. The server message is passed through verbatim because it already names the corrective action.
- `v-autocomplete` sets `no-filter` because the product picker's backend search already narrows results; Vuetify's client-side filter would double-filter and hide valid matches.
- The separate named-component `<script>` block is required so `<KeepAlive>` and devtools can identify the component by name (not possible with `<script setup>` alone).
