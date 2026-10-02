---
source: src/modules/account/views/AccountDeleteConfirm.vue
sha256: 66f82f4328f1a16a0038ba43f9befce28b0b2fa265b8d119bf9635b65ae9cb90
generated_at: 2026-10-02T12:35:12.986483+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/views/AccountDeleteConfirm.vue

## Purpose

Public, unauthenticated confirmation page that completes an account deletion started by an emailed link. The one-time token carried in the URL query is the sole credential, so the route has no auth guard and the form works for a signed-out visitor.

## Key elements

- **`AccountDeleteConfirmForm`** – single-field form state (`token?: string`), prefilled from `route.query.token`.
- **Zod schema + `useStructureFormValidation`** – validates that the token is a non-empty string; on submit, invalid input is announced and the first bad field is focused via `VUIFY_INVALID_FIELD_SELECTOR`.
- **`useClearQueryOnMount(route, router)`** – strips the `token` query param after mount so it does not persist in browser history, Umami, or Faro pageview events.
- **`useBlockingError`** – captures API errors that name no specific field (e.g., a spent or unknown token) and surfaces them in an `InlineErrorAlert` next to the submit button rather than as a toast.
- **`submitForm`** – orchestrates the flow: clears prior blocking error → validates → calls `confirmAccountDelete(token)` from the profile store → on success shows a toast and navigates to `Home`; on failure maps server errors to fields or falls back to the blocking error.
- **Template** – warning `v-alert`, single `v-text-field` for the token, a red submit button (loading/disabled while in-flight), an `InlineErrorAlert`, and a "go back to Profile" link.

## Relationships

- **`src/modules/account/stores/profile.ts`** – calls `confirmAccountDelete(token)` to perform the irreversible deletion.
- **`src/modules/account/views/TwoFactorChallenge.vue`** and **`src/infrastructure/utils/logger.ts`** – listed as graph neighbors but not directly imported or referenced in this file; no interaction is visible here.

## Notes

- The token is deliberately removed from the URL on mount (`useClearQueryOnMount`) to avoid leaking it into analytics and history.
- The `router.push` result is explicitly swallowed (`.then(() => undefined)`) because `NavigationFailure | undefined` is incompatible with the `Promise<void>` contract of the submit handler; navigation failures are the router's own concern.
- The page is intentionally **public** (no auth guard). Do not add an auth requirement to the route without also handling the token-as-credential flow.
