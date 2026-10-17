---
source: src/modules/account/views/EmailChangeConfirm.vue
sha256: 35d3be0f1d4ff846239323848109ab50a5fbe7268bd58145c60b1cd98851be88
generated_at: 2026-10-17T00:29:20.906073+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/EmailChangeConfirm.vue

## Purpose
Public confirm page for an email-change request. The one-time token arrives via the emailed link (prefilled into the form); the visitor clicks **Submit** to spend it. A deliberate submit-button (rather than an auto-fire on mount) prevents mail scanners that prefetch the link from consuming the token before a human acts.

## Key elements
- **`EmailChangeConfirmForm`** — interface holding the single `token` field.
- **`useStructureFormValidation`** (vue-toolkit) — wraps a Zod schema (`token: z.string().min(1)`), manages `form`, `formErrors`, `isSubmitting`, and `handleSubmit`; revalidates on locale change and focuses the first invalid Vuetify field.
- **`readLinkToken(route)`** — extracts the token from the route (query/params) and seeds the form.
- **`useLinkTokenCleanup(route, router)`** — strips the token from the URL after mount so it does not linger in history, pageviews, or observability payloads (Umami, Faro).
- **`useBlockingError`** — local reactive error surface (`confirmError`, `confirmErrorType`) for token-level failures (spent/unknown) that don't map to a single form field. Rendered via `<InlineErrorAlert>`.
- **`submitForm`** — clears prior blocking error, calls `confirmEmailChange(token)` from the profile store; on success fires a toast and navigates to the `Home` route (i18n-aware link). On failure routes the error into `reportConfirmError`.
- **`EmailChangeConfirmPage`** (default export) — stable component name for devtools / `<KeepAlive>`, required alongside `<script setup>`.

## Relationships
- **`src/modules/account/stores/profile.ts`** — imports `useProfileStore` and calls its `confirmEmailChange` action, which performs the actual token redemption against the server.

## Notes
- This page is structurally a mirror of the verify-email confirm page; the two prove different token types (`EMAIL_CHANGE_TOKEN_TYPE` vs. the verify type) and can never validate each other's tokens.
- `useBlockingError` is used instead of a form-field error because a spent/unknown token is a whole-request failure with no attributable field.
- The trailing `.then(() => undefined)` on `router.push` intentionally swallows the navigation result so a failed push is the router's own `onError` responsibility, not this form's.
- `VUETIFY_INVALID_FIELD_SELECTOR` is passed as the `invalidFieldSelector` so the toolkit can auto-focus the first invalid Vuetify field on submit.
