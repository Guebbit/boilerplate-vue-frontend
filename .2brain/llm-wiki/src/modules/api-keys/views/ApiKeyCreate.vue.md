---
source: src/modules/api-keys/views/ApiKeyCreate.vue
sha256: d5d1b1d279ef7fcaee6660f110264cdecd58947c0f4cffb910a9f9343f5279e3
generated_at: 2026-10-02T14:55:44.218004+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeyCreate.vue

## Purpose

The "mint" page for API keys. It presents a form (name, permissions, optional expiry), validates it, calls the store's `mintCredential` action, and—on success—displays the one-time secret in a modal before routing the visitor back to the key list. There is no dedicated detail page, so the flow is create → reveal → done → list.

## Key elements

- **`submitForm`** – Orchestrates the submit flow: clears any prior in-place error, runs `handleSubmit` (from `useStructureFormValidation`), builds a `MintApiKeyRequest` (converting `datetime-local` to ISO), calls `mintCredential`, and on success sets `revealedSecret` to trigger the modal. On failure, delegates to `permissionsRefused` or `applyServerErrors`.
- **`permissionsRefused(error)`** – Hand-parses `details.permissions` from the API error envelope to extract refused permission keys (a shape `applyServerErrors` cannot map generically). Returns a typed string array.
- **`handleSecretDone`** – Fires a success toast, clears `revealedSecret`, and navigates to `ApiKeysList` (fire-and-forget so a `NavigationFailure` doesn't overwrite the success state).
- **`revealedSecret` (ref)** – Holds the one-time secret exclusively in local component state; it is never persisted to the store.
- **`useBlockingError`** – Provides an in-place `InlineErrorAlert` for mint refusals that don't map to a specific field, keeping the error visible rather than buried in a toast.
- **`useReturnFocus`** – Returns keyboard focus to the trigger element when the reveal dialog closes.
- **Template** – A `FormCard` wrapping `v-text-field` (name), `v-combobox` (permissions, multiple/chips/closable), `v-text-field` (expiry, `datetime-local`), an `InlineErrorAlert`, and a `v-dialog` + `SecretRevealModal` for the one-time secret.

## Relationships

- **`src/infrastructure/utils/logger.ts`** – No direct import or call visible in this file's source; no interaction to document.
- **`src/modules/account/views/TwoFactorChallenge.vue`** – No direct import, prop passing, or event coupling visible in this file; no interaction to document.

The real runtime dependencies (imports) are: `useApiKeysStore`, `apiKeyCreateSchema`, `FormCard`, `SecretRevealModal`, `InlineErrorAlert`, `getFirstApiError`, `useBlockingError`, `useReturnFocus`, and the `@guebbit/vue-toolkit` composables.

## Notes

- The secret lives **only** in local component state. The store's `mintCredential` action deliberately does not cache it, so refreshing or navigating away permanently loses the key.
- `permissionsRefused` exists because the backend's refusal payload uses `details.permissions` (a flat string array) rather than the top-level `field` shape that `applyServerErrors` expects. This is a deliberate workaround, not a duplication of validation logic.
- `expiresAt` is sent as a full ISO 8601 instant (`toISOString()`), but the form binds a `datetime-local` input which carries no timezone. The browser's local offset is implicitly applied by `new Date(...)`.
- The `formElement` getter in the `useStructureFormValidation` options carries an ESLint suppression because TypeScript-ESLint cannot resolve the template ref's exposed `formElement` property across SFCs.
- `void router.push(...)` in `handleSecretDone` is intentional: a `NavigationFailure` (e.g., the user is already on the list) must not surface as an error toast after a successful mint.
