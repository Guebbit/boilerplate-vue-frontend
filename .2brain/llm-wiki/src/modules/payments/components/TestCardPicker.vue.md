---
source: src/modules/payments/components/TestCardPicker.vue
sha256: b232f43d7c4bf29bd645defc2f1ab8563c8fcd16f445ac3042e82ee7e612ae28
generated_at: 2026-10-17T01:22:52.019733+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/TestCardPicker.vue

## Purpose

A development and e2e seam that simulates a payment provider's card-selection widget. It lets a developer or test click a test card (e.g. "Card the issuer declines") instead of knowing a magic `pm_card_*` string. It is loaded only behind `import.meta.env.DEV || VITE_TEST_CARDS` via a dynamic import in `PaymentPanel`, so the production build tree-shakes it out entirely.

## Key elements

- **`TEST_CARDS`** — `as const` array of four method references (`pm_card_visa`, `pm_card_declined`, `pm_card_authentication_required`, `pm_card_processing`) that the fake provider recognises.
- **`DEFAULT_TEST_CARD`** (`'pm_card_visa'`) — auto-selected on mount when the model is still empty.
- **`paymentMethodRef`** — `defineModel<string>({ required: true })`; the two-way binding that carries the chosen reference back to the parent.
- **`disabled`** (optional prop) — locks the `<v-select>` while a payment call is in flight.
- **Local i18n** (`useI18n({ useScope: 'local', messages: … })`) — EN/IT labels for the picker and each card, kept in this file so the module's production locale bundles stay clean.
- **`<v-select>`** (template) — renders the picker; bound to `paymentMethodRef`, with `data-test="payment-method-select"` for e2e targeting.
- **`<script>` (non-setup)** — declares `name: 'TestCardPicker'` for devtools / `<KeepAlive>`; not possible from `<script setup>`.

## Relationships

- **`PaymentPanel.vue`** (parent / dynamic importer) — Imports this component behind the dev/test guard, binds the returned `paymentMethodRef` to its own state, and passes `:disabled` while a payment request is pending. No other module references this file.

## Notes

- The component is intentionally **not** registered in any production bundle; the `pm_card_*` strings are dead code in a prod build. Do not add it to a static import graph.
- Translations live here (via `useScope: 'local'`), **not** in the module's `locales/` files, to avoid leaking test-card labels into shipping locale bundles.
- The two-script pattern (`<script>` + `<script setup>`) is required solely for the `name` option; there is no other legacy logic in the non-setup block.
