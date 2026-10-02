---
source: src/modules/account/views/PasswordResetRequest.vue
sha256: 39c538513db0bdbb4c3f725bb1bd5f88b906876f04c300290037e40011ebaf2a
generated_at: 2026-10-02T12:37:44.656532+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/PasswordResetRequest.vue

## Purpose

Public, unauthenticated page where a visitor enters an email address to request a password-reset token. It always returns the same acknowledgement regardless of whether the address belongs to a real account, preventing username enumeration. The page attaches an antibot (human-challenge) token to the request before it hits the API.

## Key elements

- **`submitForm`** — Validates the email field via `useStructureFormValidation`, then calls `requestPasswordReset` (from the auth store) with the antibot token. On success, fires a success toast; on API error, maps field-level errors back to the form or falls through to `useBlockingError` for a generic inline alert.
- **`humanCheck`** (ref) — Template ref to the `<HumanCheck>` organism. Its `.token` is passed through `withAntibotToken` on every submit, so the backend gate always sees a fresh challenge.
- **`useStructureFormValidation`** — Manages `form`, `formErrors`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Configured with `revalidateOn: locale` (re-runs validation on locale switch) and `VUETIFY_INVALID_FIELD_SELECTOR` (focuses the first invalid Vuetify field).
- **`useBlockingError`** — Catches API failures that the server does not tie to a specific field; surfaces them as an `InlineErrorAlert` directly beneath the submit button.
- **`usersSchema.pick({ email: true })`** — Reuses the shared Zod schema for email format validation.
- **Template** — Single `<v-card>` containing an email `v-text-field`, `<HumanCheck>`, a block submit `<v-btn>` (with loading/disabled state), an `<InlineErrorAlert>`, and a text button linking to the `Login` route via `routerLinkI18n`.

## Relationships

- **`src/modules/account/views/TwoFactorChallenge.vue`** — Sibling view in the same account module; no direct import or call is visible in this file. They are related by module co-location and shared auth-store usage.
- **`src/infrastructure/utils/logger.ts`** — Listed as a graph neighbor, but no direct import or call appears in this file. The connection is likely indirect (e.g., through the auth store or HTTP layer it calls).

## Notes

- **Enumeration safety is a hard requirement.** The success path shows the identical toast whether or not the email exists; an e2e test asserts this. Do not add conditional messaging based on the server's response shape.
- **Antibot token is attached unconditionally.** The comment notes that `POST /account/reset` is always behind `humanChallengeGate`, so the token is read from `humanCheck.value?.token` on every submit rather than only after a first refusal.
- **`form.value.email!`** uses a non-null assertion inside `submitForm`. This is safe only because `handleSubmit` short-circuits before the callback if validation fails; the `!` silences the linter but would break if the validation contract changes.
- **Locale revalidation.** Because `revalidateOn: locale` is set, switching the active locale mid-interaction will re-run the email schema validation and potentially clear or re-populate `formErrors.email`.
- **`withAntibotToken`** is imported from `@/infrastructure/http/antibot.ts`; the token is a string or `undefined` if the challenge widget has not yet rendered its token.
