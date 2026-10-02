---
source: src/modules/payments/components/OrderReferenceSearch.vue
sha256: 152bbbf472fbce1d6f44a56640eda809cd3329ecf845b86e2cc370a35d876712
generated_at: 2026-10-02T15:26:49.747110+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/OrderReferenceSearch.vue

## Purpose
A self-contained search form that lets an operator paste a bank-statement RF creditor reference and resolve it to the corresponding order. It lives in the `payments` module because the lookup lives in the payments store, but it is deliberately host-agnostic: it emits the found `Order` and never navigates, so any parent that can act on the result can mount it.

## Key elements
- **`search()`** – Trims the typed reference, calls `paymentsStore.findOrderByReference(typed)`, then either clears the input and emits `found` with the order, or sets a blocking error (miss or failure). No-ops if the field is blank or a search is already in flight.
- **`emit('found', order)`** – The sole output channel. The host (e.g. `OrdersList.vue`) decides what "found" means (navigate, open dialog, etc.). This component names no route.
- **`useBlockingError()`** – Provides `searchError`, `searchErrorType`, `reportSearchError`, `warnSearchNotFound`, and `clearSearchError`. Both a "not found" result and a thrown error set a blocking state rendered inline via `InlineErrorAlert`; they differ only in tone and whether the error is reported to Faro.
- **`reference` (ref)** – The typed input value; cleared on a successful match.
- **`paymentsStore`** – Imported from `../store.ts`; used for the `loading` guard and the `findOrderByReference` call.
- **Template** – A Vuetify `v-card` wrapping a `v-text-field` (Enter key triggers search), a submit `v-btn`, and a full-width `InlineErrorAlert`. All elements carry `data-test` attributes prefixed `order-reference-search`.

## Relationships
- **`src/modules/payments/store.ts`** – Source of `findOrderByReference()` and the `loading` flag that gates re-submission.
- **`src/modules/orders/views/OrdersList.vue`** – Primary host: listens for the `found` event and performs the navigation to the order's edit route, since this component has no route knowledge.
- **`src/modules/payments/index.ts`** – Module entry point that registers/publishes this component for cross-module mounting.
- **`src/infrastructure/utils/logger.ts`** – Reached indirectly through `useBlockingError`'s `report` path when a real (non-miss) failure occurs.

## Notes
- The component is gated by the `payments.any.create` permission (the same key that gates recording a payment), not by any `orders` permission.
- `payments` declares no `MODULE_EDGES` reach into `orders` (FA86); this component is designed to be mounted by hosts that may not have the `orders` module at all. The emit-based contract is the workaround.
- Both a "reference not found" result and a thrown error are treated as *blocking* failures for the search UX (inline alert, no toast), per the project's request-flow convention (`docs/theory/request-flow.md`). They differ only in alert tone and whether a Faro report is sent.
- The input's `@update:model-value` clears any existing error, so editing the field immediately dismisses the inline alert.
