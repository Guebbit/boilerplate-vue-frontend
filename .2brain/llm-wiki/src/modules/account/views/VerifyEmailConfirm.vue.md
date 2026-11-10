---
source: src/modules/account/views/VerifyEmailConfirm.vue
sha256: ca94453849ec00cafad3b89592bd1ada89e4e267fbc70329f99e09ee5abbd7aa
signature: 1a097bfa98ab152d4f6c85b00b99cad7e2e4329c2cc3fcb2e53d40db27659274
generated_at: 2026-11-10T03:49:12.706721+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/VerifyEmailConfirm.vue

## Purpose

Thin page-level wrapper for the email-verification confirmation flow. The visitor arrives via a one-time token link (not necessarily signed in); this file supplies the store call, the i18n copy keys, and the `data-test` hooks, then delegates all rendering to `LinkTokenConfirmCard`. On success the user is routed to **Home** so the "verify your email" banner disappears.

## Key elements

- **`export default { name: 'VerifyEmailConfirmPage' }`** – Named-component block required because `<script setup>` cannot set a component name; used by devtools and `<KeepAlive>`.
- **`useAccountProfileStore()` → `confirmEmailVerification`** – The single store action that validates the emailed token and marks the address confirmed. Passed as the `:spend` prop to the card.
- **`copy`** – Object of five i18n keys (`intro`, `label`, `submit`, `tokenRequired`, `success`) scoped under the `verify-email-confirm-page.*` namespace.
- **`testIds`** – Three `data-test` attribute values (`verify-token`, `verify-submit`, `verify-email-confirm-error`) consumed by the card's inputs and error slot.
- **Template** – A single `<div id="verify-email-confirm-page">` wrapping `<LinkTokenConfirmCard>` with `:copy`, `:test-ids`, `:spend`, and `success-route="Home"`.

## Relationships

- **`src/modules/account/components/LinkTokenConfirmCard.vue`** – The sole child component rendered by this page. The page owns *what* the card displays (copy, test IDs) and *what happens on submit* (`:spend`); the card owns the form layout and validation UI.
- **`src/modules/account/stores/profile.ts`** – Provides `confirmEmailVerification`, the async action the card calls when the user submits. This page is the composition point that binds that action to the card's `:spend` prop.
- **`src/modules/account/tests/link-token-confirm-card.spec.ts`** – Unit tests target `LinkTokenConfirmCard` in isolation (copy, test-ids, and `spend` prop contract). This page is a primary consumer of that contract; breaking prop names here would surface in that spec.

## Notes

- The page deliberately carries **no** local reactive state, validation logic, or API calls—everything is pushed into the card. If you need to change wording, edit the i18n keys in `copy`; if you need to change *what* gets submitted, swap the store action.
- `success-route` is the literal string `"Home"`, resolved by the card's router. There is no `route()` helper or path constant here.
- The dual `<script>` / `<script setup>` split exists solely for the component `name`; the plain `<script>` block contains nothing else.
