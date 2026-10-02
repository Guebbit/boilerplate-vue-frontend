---
source: src/modules/account/views/EmailChangeConfirm.vue
sha256: 3d317a2ca302a2ceb10fbcea15fcae36989c4df2b4a7b4029f9dc34de0d0c10b
generated_at: 2026-10-02T12:35:44.804806+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/EmailChangeConfirm.vue

## Purpose

Public confirmation page reached by clicking the email-change link (token delivered in the URL query). It presents the prefilled one-time token with a submit button — deliberately not auto-firing on mount — so that a mail-client prefetch or link scanner cannot spend the token before the user actually arrives. On success it navigates to Home; on failure it surfaces an inline blocking error.

## Key elements

- **`EmailChangeConfirmForm`** — single-field interface (`token?: string`), prefilled from `route.query.token`.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Zod-validated form handling; revalidates on locale change; focuses the first invalid Vuetify field on failed submit.
- **`useClearQueryOnMount`** — strips the token from the URL immediately after mount so it doesn't leak into pageview analytics (Umami, Faro) or browser history.
- **`useBlockingError`** — local error slot for failures that don't map to a specific form field (spent/unknown token); rendered via `<InlineErrorAlert>` next to the submit button.
- **`submitForm`** — clears any prior blocking error, calls `confirmEmailChange(token)` from the profile store; on success toasts and routes to `Home`; on failure feeds the error into the blocking-error slot. The trailing `.then(() => undefined)` discards `router.push`'s navigation promise so a failed navigation isn't misreported as a form error.
- **Template** — Vuetify card with a single `v-text-field` (token), a block `v-btn` (submit, loading/disabled while in flight), and the `InlineErrorAlert`.

## Relationships

No direct import of the listed graph neighbors (`logger.ts`, `TwoFactorChallenge.vue`) is visible in this file. The code follows the same structural pattern as the verify-email confirm page (referenced in comments) and relies on `useProfileStore.confirmEmailChange` for the API call.

## Notes

- The token is the **only** credential; there is no secondary secret. The "submit button rather than mount-time fire" design is the sole defense against link-scanner token spending.
- `useClearQueryOnMount` runs unconditionally on mount, before the user can interact — the token is intentionally short-lived in the URL.
- The `then(() => undefined)` after `router.push` is a deliberate swallow: a navigation failure is the router's own `onError` concern, not this form's. Same convention as the verify-email confirm page.
- The form has no other fields; the token is read-only in practice (prefilled from the link), but the `v-text-field` still allows manual editing before submit.
