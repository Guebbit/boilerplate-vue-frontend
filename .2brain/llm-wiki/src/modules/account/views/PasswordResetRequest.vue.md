---
source: src/modules/account/views/PasswordResetRequest.vue
sha256: 6b991df650c1c40533620aeb19faf4b5454346cddbca3dedf62c62674d712b70
generated_at: 2026-10-17T00:30:26.973980+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetRequest.vue

## Purpose

Public-facing password-reset request page. The visitor enters an email address, a human-challenge token is attached, and the component calls the backend to schedule a reset-token email. The UI always shows the same "check your inbox" acknowledgement regardless of whether the address is registered, preventing account enumeration.

## Key elements

- **`PasswordResetRequestPage`** (default export, non-setup script) — assigns a stable `name` for `<KeepAlive>` and devtools; required because `<script setup>` cannot declare one.
- **`submitForm()`** — the only submit handler. Clears any prior blocking error, runs client-side validation via `useStructureFormValidation`, then calls `useAuthStore().requestPasswordReset(email, antibotToken)`. On success dispatches a success toast; on API failure routes the error to `applyServerErrors` (field-level) or `useBlockingError` (form-level).
- **`humanCheck` ref** — template ref to the `HumanCheck` organism. `withAntibotToken(humanCheck.value?.token)` attaches the challenge token to every request unconditionally (the route is always behind `humanChallengeGate`).
- **`useStructureFormValidation`** — manages `form.email`, `formErrors`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Revalidates on locale change; focuses the first invalid Vuetify field on submit failure.
- **`useBlockingError`** — local state for API errors that name no specific field; rendered inline via `InlineErrorAlert` next to the submit button.
- **`useNotificationsStore` / `addMessage`** — toast notifications for success and for "fix your errors" on invalid submit.

## Relationships

- **`src/modules/account/stores/auth.ts`** — imports `useAuthStore`; calls its `requestPasswordReset(email, antibotToken)` action to trigger the server-side reset flow.
- **`src/modules/account/tests/password-reset-request-view.spec.ts`** — unit/spec suite for this component; includes an enumeration-safety assertion verifying the response is identical for existing vs. non-existing addresses.

## Notes

- The component name lives in a **separate** `<script>` block (not `<script setup>`) because Vue's setup syntax has no mechanism to declare `name`. Both blocks are required.
- `humanCheck` is attached **unconditionally**, not conditionally after a first bot refusal, because the backend endpoint is always guarded by `humanChallengeGate`.
- The eslint-disable comment on the `withAntibotToken(...)` call is load-bearing: TS-ESLint cannot fully resolve `InstanceType<typeof HumanCheck>` through the SFC boundary even though `token` is explicitly exposed.
- `form.value.email!` uses a non-null assertion inside the submit callback; the toolkit guarantees the field is validated (and non-empty) before the inner callback executes.
