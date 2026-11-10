---
source: src/modules/example/views/ExampleCreate.vue
sha256: 7c7a5b7a11e962ca99977418150c1c3d381191238589bfa1f4c3091743da7b7d
signature: 7c7a5b7a11e962ca99977418150c1c3d381191238589bfa1f4c3091743da7b7d
generated_at: 2026-11-10T04:28:11.509589+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleCreate.vue

## Purpose
Create screen for the Example entity. Renders a two-field form (title, body) inside the shared `FormCard`, validates input against a Zod schema, calls the store's `createExample` action, and navigates to the newly created record on success.

## Key elements
- **`submitForm()`** — Orchestrates the full create flow: clears any prior blocking error, runs validation via the composable, calls `createExample` with a body built by `toRequestBody`, fires a success toast, and pushes to the target route.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — Supplies `form`, `formErrors`, `isDirty`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Configured with `revalidateOn: locale` so i18n switches re-render validation messages.
- **`useLeaveGuard`** — Prompts before an in-progress navigation discards unsaved input; `markSaved()` suppresses the guard once the create succeeds.
- **`useBlockingError`** — Dedicated in-place error slot for *unmapped* server failures (shown via `InlineErrorAlert`), keeping them separate from the toast queue.
- **`exampleFormSchema`** — Zod schema imported from `../schemas.ts`; drives both client-side validation and server-error field mapping.
- **`createExample`** — Pinia store action (from `../store.ts`) that owns the idempotency key and the HTTP call.
- **`FormCard`** (`ref="card"`) — Shared form wrapper exposing `formElement`, the submit button, loading state, and back-navigation link.
- **`fieldErrorProps`** — Binds per-field error strings onto Vuetify `v-text-field` / `v-textarea` inputs.

## Relationships
- **`src/modules/example/schemas.ts`** — Imports `exampleFormSchema` (Zod) as the validation contract for both the form and server-error mapping.
- **`src/modules/example/store.ts`** — Imports `useExampleStore` to call the `createExample` action; the store owns the idempotency-key lifecycle for retried submits.
- **`src/modules/example/tests/example-create-view.spec.ts`** — Unit/E2E spec that exercises this component's validation, submit, and error paths.

## Notes
- **Dual `<script>` blocks:** A plain `<script>` exports `{ name: 'ExampleCreatePage' }` because `<script setup>` cannot set a component name; this is required for `<KeepAlive>` matching and devtools readability.
- **Deferred `formElement`:** Passed as `() => card.value?.formElement` (a getter) so the element is read only when a failed submit actually needs it, avoiding a null read during mount.
- **`toRequestBody` on create:** Omits empty fields entirely rather than sending `null`, since a create has no prior value to "clear."
- **Fire-and-forget navigation:** `router.push` after a successful create is deliberately not awaited/catched; a `NavigationFailure` must not convert a completed create into a user-visible error.
- **Error routing:** Mapped (field-level) server errors populate `formErrors` and surface on the inputs; unmapped errors land in the `InlineErrorAlert` via `reportSubmitError`. Toast (`addMessage`) is used only for the generic "fix your errors" hint and the success message.
