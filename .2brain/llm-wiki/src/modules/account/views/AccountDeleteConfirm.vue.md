---
source: src/modules/account/views/AccountDeleteConfirm.vue
sha256: baa16cb0032300d30ace7ee7a77f82c6db08cc6b3f11a2c77f85d0fd10ab8644
generated_at: 2026-10-17T00:28:57.137837+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountDeleteConfirm.vue

## Purpose

Public, unauthenticated confirmation page for permanent account deletion. The one-time token delivered via email link serves as the sole credential, so the route requires no auth guard and must work for a signed-out visitor.

## Key elements

- **`submitForm`** — Orchestrates the deletion flow: clears any prior blocking error, runs `confirmAccountDelete` through the toolkit's `handleSubmit`, toasts success and redirects to `Home`, or routes server errors to a field / the inline blocking alert.
- **`useStructureFormValidation` (from `@guebbit/vue-toolkit`)** — Provides `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. The schema requires a non-empty `token`; `revalidateOn` is bound to `locale`.
- **`useLinkTokenCleanup(route, router)`** — Strips the `#token=` fragment from the URL after mount so it stops leaking into pageview analytics (Umami, Faro) and browser history.
- **`useBlockingError()`** — Local error surface for responses that name no specific field (e.g. a spent/unknown token); rendered as an `InlineErrorAlert` next to the submit button.
- **`AccountDeleteConfirmForm`** — Local interface describing the single `token?` field.
- **Template** — A `v-card` with a warning `v-alert`, a `v-text-field` for the token, a `v-btn` submit, an `InlineErrorAlert` for blocking errors, and a "go back" link to the Profile page.

## Relationships

- **`src/modules/account/stores/profile.ts`** — Imported as `useProfileStore`; its `confirmAccountDelete(token)` action is the sole mutation this page triggers.

## Notes

- The component declares its `name` in a separate `<script>` block because `<script setup>` cannot set one; this is needed for `<KeepAlive>` and devtools.
- `router.push` resolves to `NavigationFailure | undefined`, which doesn't satisfy `Promise<void>`; the extra `.then(() => undefined)` swallows it intentionally. Navigation failures are the router's `onError` concern, not this form's.
- The `token` field is prefilled from the route via `readLinkToken(route)`—it is not a user-typed secret in practice, but the UI still validates it client-side before the API call.
- The page is deliberately **not** behind an auth guard; the token *is* the authentication.
