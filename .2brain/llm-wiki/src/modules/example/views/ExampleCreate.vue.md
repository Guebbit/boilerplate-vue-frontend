---
source: src/modules/example/views/ExampleCreate.vue
sha256: 2892ef81da560aece1589fa307bc3ff05e3e44472c171354702046f173c52f58
generated_at: 2026-10-17T00:54:23.839778+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleCreate.vue

## Purpose

The create-form screen for the Example module. It renders a two-field form (title, body) inside the shared `FormCard`, validates input against a Zod schema via `useStructureFormValidation`, calls the store's `createExample` action, then toasts success and navigates to the newly created example.

## Key elements

- **`submitForm`** — Orchestrates the full create flow: clears any prior blocking error → validates → builds the request body with `toRequestBody` (omits empty fields) → dispatches `createExample` → on success toasts + `router.push` to `ExampleTarget`; on failure maps server errors to fields or blocks the form in place via `useBlockingError`.
- **`useStructureFormValidation<{ title?, body? }>`** — Provides `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`, and `applyServerErrors`. Configured with a lazy `formElement` getter (resolves `card.value?.formElement` at submit time), `revalidateOn: locale`, and the Vuetify invalid-field CSS selector for scroll-to-error.
- **`useBlockingError`** — Exposes `message`, `report`, and `clear` for a single, form-local error banner (`InlineErrorAlert`) shown when a server refusal does not map to a specific field.
- **Named component block (`ExampleCreatePage`)** — Declared in a separate `<script>` (non-setup) so `<KeepAlive>` and devtools can reference the component by name; `<script setup>` cannot set `name` directly.
- **Template** — `FormCard` (submit, back-link to `ExamplesList`, loading state) wrapping a `v-text-field` for title, a `v-textarea` for body, and an `InlineErrorAlert` for the blocking error.

## Relationships

- **`src/modules/example/schemas.ts`** — Imports `exampleCreateSchema` (Zod) which defines the validation rules for the title/body shape.
- **`src/modules/example/store.ts`** — Imports `useExampleStore` and calls its `createExample` action with the serialised body.
- **`src/modules/example/tests/example-create-view.spec.ts`** — Unit/integration spec covering this view's rendering, validation, and submit paths.

## Notes

- `formElement` is passed as a **getter** (`() => card.value?.formElement`) because `FormCard` may still be mounting when the composable initialises; resolving eagerly would give `undefined`. An eslint-disable is required because TS-ESLint cannot fully resolve `InstanceType<typeof FormCard>` for an exposed template ref.
- Navigation after a successful create is intentionally **fire-and-forget** (`void router.push(...)`) so that a `NavigationFailure` does not reject the already-completed create promise.
- `toRequestBody('CreateExampleBody', …)` is used instead of sending the raw form object, ensuring absent (undefined) fields are omitted from the payload rather than transmitted as `null`.
- The `revalidateOn: locale` option means Zod's error messages re-render when the user switches locale, keeping them in sync with the i18n dictionary.
