# src/modules/account/views/PasswordResetRequest.vue

## Purpose

Public-facing page that collects an email address and requests a password-reset token from the backend. It always displays the same success acknowledgement regardless of whether the account exists, preventing username enumeration.

## Key elements

- **`submitForm`** — Orchestrates the submit flow: calls `requestPasswordReset(email)` from the auth store, shows a success toast on resolution, and routes API errors either to the relevant field (`applyServerErrors`) or to a generic toast (`notifyErrorMessages`).
- **`useAppForm`** — Manages form state (`form`, `formErrors`, `isSubmitting`) and wraps the async submit with `handleSubmit`. Validates against `usersSchema.pick({ email: true })` (Zod) before the handler runs.
- **`useAuthStore().requestPasswordReset`** — The API call that actually requests the reset token.
- **Template** — Single email field + submit button inside a `v-card`, plus a "Go to Login" text button. Uses `novalidate` so the app's own validation (not browser-native) is authoritative.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (listed graph neighbor) — Not directly imported or referenced in this file. No observable interaction in the source.

## Notes

- **Enumeration safety is intentional and tested:** the component never branches its UI on whether the email belongs to an existing account. An e2e test asserts this; do not add conditional messaging.
- **Non-null assertion on `form.value.email!`:** safe only because `handleSubmit` gates the callback behind successful schema validation; the handler is never invoked with an invalid/missing email.
- **Dual `<script>` blocks:** the plain `<script>` block exists solely to set `name: 'PasswordResetRequestPage'` (required for devtools/keep-alive). All logic lives in `<script setup>`.
- **`routerLinkI18n({ name: 'Login' })`** is used for the back-link so the route is locale-aware; do not hard-code a path.
