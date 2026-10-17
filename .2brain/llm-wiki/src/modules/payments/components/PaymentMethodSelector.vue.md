---
source: src/modules/payments/components/PaymentMethodSelector.vue
sha256: fde60907e1679a834926f053715399552d2a53c65a7dd762d08f6773511d2b86
generated_at: 2026-10-17T01:21:33.449557+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/PaymentMethodSelector.vue

## Purpose

A presentational radio-group widget that lets the user pick a payment method during checkout. It is intentionally blank (renders nothing) when the backend offers only one method, since a single option is not a meaningful choice. Selection is surfaced to the parent via `v-model`; the server defaults to `card` when nothing is sent.

## Key elements

- **`defineModel<PaymentMethodId | undefined>()`** — two-way binding exposed to the parent as `v-model`. `undefined` means "no explicit selection."
- **`usePaymentsStore()` / `storeToRefs`** — pulls the reactive `methods` array from the Pinia store.
- **`onMounted` guard** — calls `paymentsStore.fetchMethods()` once if the list is still empty, keeping the fetch logic out of the parent.
- **`v-if="methods.length > 1"`** — the entire component (including heading) is omitted when only one method exists.
- **`useId` → `aria-labelledby`** — the `<h3>` heading doubles as the accessible label for the radio group.
- **`holdHours` badge** — a small annotation shown *inside* the radio label for methods that carry it (currently `bank_transfer`); it tells the user how long stock is reserved *before* the choice is made.
- **`data-test` attributes** — `payment-method-selector`, `payment-method-<id>`, and `payment-method-hold-hours` for end-to-end selectors.

## Relationships

- **`src/modules/payments/store.ts`** — imports `usePaymentsStore`; reads `methods` and calls `fetchMethods()` on mount. This is the sole data dependency.
- **`src/modules/payments/index.ts`** — the module barrel; this component is re-exported (or at least co-located) so consumers can import it alongside the store from a single path.

## Notes

- The dual `<script>` / `<script setup>` pattern exists solely to set the component `name` for `<KeepAlive>` and devtools; the setup block cannot declare one.
- The `holdHours` span deliberately avoids `opacity-*` utilities — they failed axe 4.5:1 contrast inside the radio label on the cart page. Use a `text-*` color class if you adjust it.
- Translation keys follow `payment-method-selector.method-<id>`, so adding a new method id requires a corresponding i18n entry in every locale or the label will render as the raw key.
