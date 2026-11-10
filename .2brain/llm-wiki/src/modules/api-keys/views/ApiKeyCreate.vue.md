---
source: src/modules/api-keys/views/ApiKeyCreate.vue
sha256: 26e3ca01c3a78c71bf78633aefc391543a3ee142c1c6c0f88937e655ed44d176
signature: 26e3ca01c3a78c71bf78633aefc391543a3ee142c1c6c0f88937e655ed44d176
generated_at: 2026-11-10T03:52:18.679385+00:00
model: ollama:qwen3.8:27b
---

# src/modules/api-keys/views/ApiKeyCreate.vue

## Purpose

Single-page form for minting a new API key. Collects a name, a set of permissions, and an optional expiry, validates them against a Zod schema, submits via the Pinia store, and—on success—displays the one-time secret in a modal. There is no detail page for an API key, so after the modal the user is routed back to the list.

## Key elements

- **`submitForm`** — Orchestrates validation → `mintCredential` call → error triage. On success stores the returned secret in `revealedSecret`.
- **`permissionsRefused`** *(local helper)* — Extracts the list of refused permission keys from a 422 `details.permissions` payload so each can be rendered as a per-key error on the combobox, instead of a single generic message.
- **`latestExpiry`** *(computed)* — Converts the server-supplied `maxExpiresAt` ISO string into a `datetime-local`-compatible string (local wall-clock) to cap the date picker; `undefined` when the list hasn't loaded yet.
- **`handleSecretDone`** — Dismisses the reveal modal, fires a success toast, clears `revealedSecret`, and navigates to `ApiKeysList`.
- **`revealedSecret`** — Local `ref<string | undefined>` holding the one-time secret. Never persisted to the store or anywhere else.
- **`useStructureFormValidation`** — Shared composable that wires form state, `formErrors`, `isDirty`, `handleSubmit`, and `applyServerErrors` against `apiKeyCreateSchema`.
- **`useBlockingError`** / **`InlineErrorAlert`** — In-place error banner shown when the mint call fails with a shape that `applyServerErrors` cannot map to a field.
- **`useLeaveGuard`** — Prompts before navigation if the form is dirty; `markSaved()` suppresses the prompt after a successful mint.

## Relationships

- **`src/modules/api-keys/store.ts`** — Consumes `useApiKeysStore()` for the `mintCredential` action and the reactive `maxExpiresAt` (used to cap the expiry picker).
- **`src/modules/api-keys/schemas.ts`** — Imports `apiKeyCreateSchema` (Zod) as the validation contract passed to `useStructureFormValidation`.
- **`tests/cross-cutting/module-map.spec.ts`** — Cross-cutting test that asserts this view is wired into the api-keys module's route map.

## Notes

- The file uses a dual-script pattern: a plain `<script>` block solely to set `name: 'ApiKeyCreatePage'` (required for `<KeepAlive>` / devtools since `<script setup>` cannot declare it).
- `expiresAt` is sent as a true ISO instant (`new Date(...).toISOString()`), not the raw `datetime-local` value, because the HTML input carries no timezone.
- The secret is deliberately kept out of the Pinia store's cache (`mintCredential` in `store.ts` strips it before caching the record).
- A failed mint is surfaced in-place via `InlineErrorAlert` rather than a toast, so a user who has scrolled past the form still sees the failure.
- `void router.push(...)` in `handleSecretDone` is intentional: a `NavigationFailure` (e.g. double-press) must not convert a completed mint into an error toast.
