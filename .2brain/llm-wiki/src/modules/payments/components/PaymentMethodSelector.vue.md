---
source: src/modules/payments/components/PaymentMethodSelector.vue
sha256: 61857a0d41f543b7ff2817d00bc3668587ce5bd9ea9cadfe3476c8ccba018b72
signature: c2d84cf1d9b58ce04585fe79d58735a795f97bc243a4ced174bd58b6029f3f85
generated_at: 2026-11-10T05:08:36.512106+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentMethodSelector.vue

## Purpose
Renders a radio-group selector for choosing a payment method during checkout. It is hidden entirely when the store exposes only one method (a single option is not a "choice"), and it lazily fetches the method list on mount if the store is still empty.

## Key elements

- **`name: 'PaymentMethodSelector'`** (default export) — stable component name for devtools and `<KeepAlive>`, since `<script setup>` cannot set it.
- **`methodId`** (`defineModel<PaymentMethodId | undefined>`) — two-way binding for the selected method id; `undefined` means no selection (server defaults to `card`).
- **`methods`** (via `storeToRefs`) — reactive array of available payment methods from the payments store.
- **`onMounted` hook** — calls `paymentsStore.fetchMethods()` only when `methods` is still empty; failures are surfaced through `useAmbientError` (a toast, since there is no form to host an inline error).
- **`v-radio-group` / `v-radio`** (Vuetify) — the UI; each radio's label includes the i18n method name and, for `bank_transfer` only, a "hold hours" annotation (`method.holdHours`).
- **`titleId`** (`useId()`) — shared id linking the `<h3>` heading to the radio group via `aria-labelledby`.

## Relationships

- **`src/modules/payments/store.ts`** — consumes `usePaymentsStore` for the `methods` list and `fetchMethods()` action; reads via `storeToRefs` to keep reactivity.
- **`src/modules/payments/index.ts`** — module barrel; this component is part of the payments module's public surface (registered/available to the rest of the app through that entry point).

## Notes

- The component renders **nothing** (not even an empty wrapper) when `methods.length <= 1` — the `v-if="methods.length > 1"` gate hides the whole block.
- `holdHours` is intentionally displayed *before* the user commits to a method (it informs the choice) and is distinct from the post-checkout `payBy` deadline.
- No `opacity-*` utility is used inside radio labels because it failed axe's 4.5:1 colour-contrast check in the cart context.
- Translation keys follow the pattern `payment-method-selector.method-{id}` (e.g. `payment-method-selector.method-bank_transfer`); adding a new method id requires a matching i18n key.
