---
source: src/modules/account/views/PasswordResetRequest.vue
sha256: f6199d86272c010f70d57ec70be6a1a91963ccc7e70056fef0a4e4dabfd25ccb
signature: f6199d86272c010f70d57ec70be6a1a91963ccc7e70056fef0a4e4dabfd25ccb
generated_at: 2026-11-10T03:47:27.317465+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetRequest.vue

## Purpose

Public-facing page where a visitor enters their email to request a password-reset token. The response is deliberately identical whether or not the account exists, to prevent username/email enumeration.

## Key elements

- **`submitForm`** — entry point on submit; clears any prior blocking error, runs toolkit validation, then calls `requestPasswordReset` with the antibot token. Catches API errors: mapped field errors go to the field, unmapped errors land in the blocking-error alert under the button.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — owns form state, per-field error surfacing, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Revalidates when `locale` changes.
- **`useBlockingError`** — a small reactive block for API failures that name no specific field; rendered by `InlineErrorAlert` in the `#after-submit` slot.
- **`requestPasswordReset`** (destructured from `useAccountAuthStore`) — the store action that actually POSTs to the backend.
- **`humanCheck` / `withAntibotToken`** — the `HumanCheck` widget's token is attached unconditionally to every request because the endpoint is always behind `humanChallengeGate`.
- **`card` ref / `formElement`** — passes the mounted `FormCard`'s `<form>` element into the toolkit's validation helpers via the `formElement` callback.

## Relationships

- **`src/modules/account/stores/auth.ts`** — provides `useAccountAuthStore`, whose `requestPasswordReset` action is the sole API call this page makes.
- **`src/modules/account/tests/password-reset-request-view.spec.ts`** — unit/e2e test suite that asserts the enumeration-safety behaviour (identical acknowledgement for known vs. unknown addresses) and form interaction.

## Notes

- Component name is declared in a **separate** plain `<script>` block because `<script setup>` cannot set `name`; required for devtools and `<KeepAlive>`.
- `HumanCheck` is mounted unconditionally (not conditionally after a bot-refusal), matching the server-side `humanChallengeGate` that guards the route at all times.
- Two `eslint-disable` comments suppress `@typescript-eslint/no-unsafe-*` rules; they exist because ESLint cannot resolve the SFC instance type of `InstanceType<typeof FormCard>` / `InstanceType<typeof HumanCheck>` even though both components `defineExpose` the needed members.
- The page has no `<style>` block; visual layout is entirely from `FormCard` and Vuetify.
