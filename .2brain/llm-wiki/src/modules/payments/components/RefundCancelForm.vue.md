---
source: src/modules/payments/components/RefundCancelForm.vue
sha256: c16e4f2854b4ed2504aa3ca1260c88f51c5ec0e591e4535920998d46649fcb22
signature: 8a244937ff30e9745c04b8a6a1c3faa9a38b808da419dfc0411371a031efc516
generated_at: 2026-11-10T05:10:01.912297+00:00
model: ollama:qwen3.8:27b
---

# src/modules/payments/components/RefundCancelForm.vue

## Purpose
A small form that collects a single required free-text note explaining why a staff member is voiding a refund. It validates the note locally and emits it upward; it deliberately owns no network request or error handling—that responsibility lives in the host drawer so that rejection messages appear next to the refund list.

## Key elements
- **Props `busy: boolean`** — disables both action buttons while the host's cancel request is in flight, preventing double-submits.
- **Emits `submit(note: string)`** — fires once the zod-validated, trimmed note is ready for the host to send.
- **Emits `dismiss`** — fires when the staff member cancels the form without submitting.
- **`schema`** — a one-field zod object (`{ note: cancelRefundNoteSchema }`) imported from `../schemas.ts`, enforcing the note's shape and max length.
- **`useStructureFormValidation`** — wires the schema to reactive `form` state, `formErrors`, `showFormErrors`, and a `handleSubmit` gate; re-validates when the i18n `locale` changes and toasts "fix errors" on an invalid submit.
- **`fieldErrorProps`** — converts the array of field errors into Vuetify `v-text-field` props (error text, aria attributes).
- **Template** — a `<form novalidate>` with a single `v-text-field` (capped at `cancelRefundNoteMax`) and two `v-btn` actions (submit / dismiss). All interactive elements carry `data-test` attributes for the test suite.

## Relationships
- **`src/modules/payments/schemas.ts`** — provides `cancelRefundNoteSchema` (zod shape) and `cancelRefundNoteMax` (character cap) that this form imports directly; the form's validation is entirely defined by those exports.
- **`src/modules/payments/components/PaymentDrawer.vue`** — the expected host. It renders `RefundCancelForm`, passes `busy`, listens for `submit`/`dismiss`, and performs the actual `cancelRefund` API call plus error display.
- **`src/modules/account/views/TwoFactorChallenge.vue`** — shares the same `@guebbit/vue-toolkit` form-validation and notification utilities; no direct import, but the two components follow the identical validation/toast pattern.

## Notes
- The `<script>` (non-setup) block exists solely to set the component `name` for `<KeepAlive>` / devtools, since `<script setup>` cannot declare one.
- The submit button uses `color="error"` (red) because the action is destructive (voiding a refund); the dismiss button is neutral.
- `handleSubmit`'s callback receives the parsed form object; the note is emitted as-is (zod's `.trim()` in the schema guarantees no surrounding whitespace).
- The form has no `action` attribute and uses `@submit.prevent`; there is no native form submission path.
