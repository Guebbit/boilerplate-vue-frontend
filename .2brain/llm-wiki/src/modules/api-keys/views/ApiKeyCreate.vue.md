---
source: src/modules/api-keys/views/ApiKeyCreate.vue
sha256: 3bf21846a0fc24ed3dab743b52e71d3ec1df3199ebbe62da8b6ed96edfbe054e
generated_at: 2026-10-17T00:33:04.192845+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeyCreate.vue

## Purpose

Single-page form for minting a new API key. Collects a name, a set of permissions, and an optional expiry; on success the one-time secret is displayed in a modal (there is no detail page to redirect to). On failure it maps permission-specific refusals to the combobox and surfaces anything else as a blocking inline alert.

## Key elements

- **`submitForm`** – Validates via `useStructureFormValidation`, builds a `MintApiKeyRequest` (converting `expiresAt` from `datetime-local` to an ISO instant), calls `mintCredential`, and sets `revealedSecret` on success. On rejection it checks `permissionsRefused` before falling through to `applyServerErrors` / `reportSubmitError`.
- **`permissionsRefused(error)`** – Extracts `details.permissions[]` from the first API error envelope; returns an empty array when the shape doesn't match. Used to render one localized message per refused key on the `v-combobox`.
- **`revealedSecret`** – A local `ref<string | undefined>` that gates the `SecretRevealModal` v-dialog. Cleared on "Done" to dismiss the modal.
- **`handleSecretDone`** – Fires a success toast, clears `revealedSecret`, and navigates to `ApiKeysList` (fire-and-forget; a `NavigationFailure` is intentionally swallowed so a completed mint is never turned into an error).
- **`useBlockingError`** – Provides `submitError` / `reportSubmitError` / `clearSubmitError` for the in-place `InlineErrorAlert` beneath the form fields.
- **`useReturnFocus`** – Restores focus to the trigger element when the reveal dialog closes.
- **Named component (`ApiKeyCreatePage`)** – Declared in a separate `<script>` block to give the SFC a stable name for DevTools / `<KeepAlive>`.

## Relationships

- **`src/modules/api-keys/schemas.ts`** – Imports `apiKeyCreateSchema`, the Zod (or similar) schema that drives client-side field validation inside `useStructureFormValidation`.
- **`src/modules/api-keys/store.ts`** – Imports `useApiKeysStore`; calls its `mintCredential` action to POST the new key and receive the one-time secret. The store does **not** cache the secret; it lives only in this component's local ref.

## Notes

- The `expiresAt` field is a `datetime-local` input (no timezone). The code calls `new Date(form.expiresAt).toISOString()` before sending, which interprets the naive local string in the browser's timezone. This is a deliberate contract bridge, not a bug, but it means the stored instant depends on the user's local offset at submit time.
- The `formElement` getter for `useStructureFormValidation` requires an eslint-disable because TypeScript-ESLint cannot resolve the Vue SFC instance type through the template ref. This is expected and will persist until the tooling improves.
- Permission refusal errors are handled *before* the generic `applyServerErrors` path, so the combobox gets per-key messages rather than a single catch-all string. If the backend ever changes the error shape (e.g., moves `permissions` to a different key), `permissionsRefused` silently returns `[]` and the user falls through to the generic error path.
- The component intentionally does **not** redirect to a detail page after creation (unlike the analogous webhook flow); it always returns to the list.
