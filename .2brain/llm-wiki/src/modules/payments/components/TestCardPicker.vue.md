---
source: src/modules/payments/components/TestCardPicker.vue
sha256: b232f43d7c4bf29bd645defc2f1ab8563c8fcd16f445ac3042e82ee7e612ae28
signature: d9709f6c5cb256e5d023c4eecd9d9c952c31b7e06e9fdcc8a473b7498dbacb09
generated_at: 2026-11-10T05:10:35.697089+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/TestCardPicker.vue

## Purpose

A dev/e2e-only `<v-select>` that lets a user (or test script) pick one of the fake payment provider's well-known test-card references (`pm_card_visa`, `pm_card_declined`, etc.) instead of integrating a real PSP widget. It is dynamically imported by `PaymentPanel` behind a dev/test environment guard that the production build folds to `false`, so this chunk and its `pm_card_*` literals are never emitted to clients.

## Key elements

- **`TEST_CARDS`** – `as const` array of the four method-reference strings the fake provider recognises (visa, declined, auth-required, processing).
- **`DEFAULT_TEST_CARD`** – `'pm_card_visa'`; the value written into the model on mount if it is still empty.
- **`paymentMethodRef`** – `defineModel<string>()` (required two-way binding). The parent owns the value; this component only seeds the default in `onMounted`.
- **`disabled`** – optional prop; locks the select while a payment request is in flight.
- **Local i18n (`useI18n({ useScope: 'local', messages })`)** – EN/IT labels and per-card descriptions defined inline in this file so they never enter the app-wide locale bundles.
- **`<template>`** – a single Vuetify `<v-select>` bound to the model, with a `data-test="payment-method-select"` hook for e2e selectors.

## Relationships

- **`src/modules/payments/components/PaymentPanel.vue`** – sole consumer. It dynamically imports this file behind a dev/test environment guard, passes the chosen card reference back via the `paymentMethodRef` model, and toggles the `disabled` prop during an in-flight payment call.

## Notes

- **Production safety depends on the dynamic-import guard.** If the import is ever made static or the condition removed, `pm_card_*` strings would leak into a shipped bundle.
- **Component name lives in a separate `<script>` block** (not `<script setup>`), which is the Vue 3 idiom for giving an SFC a stable `name` usable by `<KeepAlive>` and devtools.
- **The default card is assigned in `onMounted`, not as the model's initial value**, deliberately so no `pm_card_*` literal appears in the panel's render scope.
- **i18n messages are file-local** (`useScope: 'local'`). Do not move them into the module's shared locale files, which are shipped in every production build.
