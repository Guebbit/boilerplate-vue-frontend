# src/modules/products/views/ProductEdit.vue

## Purpose

Vue single-file component (`ProductEditPage`) that renders a product edit form. It auto-hydrates fields from the fetched record in the products store, validates user input with a Zod schema, and submits changes—including an optional replacement image—through the store's multipart-aware `updateProduct` action.

## Key elements

- **`editSchema`** – Zod schema (built from `productsSchema.pick({title, price}).extend(…)`) requiring `title` and `price`; optional `description`, `active`, `imageUpload`. Messages are thunks resolved at parse time so they track the active locale without rebuild.
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) – Provides `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `resetForm`, `handleSubmit`, `activateAutoHydrate`, and `applyServerErrors`. Bound to `locale` via `revalidateOn` for live re-validation.
- **`activateAutoHydrate`** – Populates the form model from `currentProduct` once the store finishes fetching.
- **`trackUpload`** – Thin wrapper around the toolkit's `useUploadProgress.track`; enables progress tracking only when a `File` is present.
- **`submitForm`** – Validates, calls `updateProduct(id, payload, options)`, clears `imageUpload` on success, and shows a toast. Falls through to `applyServerErrors` / `notifyErrorMessages` on failure.
- **`watchProduct(() => id)`** – (Re)fetches the product whenever the route `id` param changes.
- **`heroTitle` / `heroDescription`** – Computed fallbacks for the hero section (loaded title → route id → i18n label).

## Relationships

- **`src/infrastructure/utils/logger.ts`** – No direct import or call is visible in this file. The dependency-graph link is likely transitive (e.g., through the products store or the toolkit). No explicit interaction to document here.

## Notes

- **Locale-reactive schema:** `editSchema` messages are thunks (same pattern as `@/modules/users/schemas.ts`), so switching locale re-validates without rebuilding the schema. `revalidateOn: locale` triggers the re-check.
- **Narrowing workaround:** `form.value` is destructured *before* the `if` guard inside `submitForm` because TypeScript cannot narrow a mutable `Ref` inside a nested closure.
- **Progress fallback:** `event.progress ?? 0` guards against `undefined` progress on chunked/compressed uploads; the bar stays at 0 rather than jumping.
- **Image-reset after save:** Setting `form.value.imageUpload = undefined` post-success prevents a second save from re-uploading the same bytes; the preview falls back to the store's `imageUrl`.
- **`novalidate` on `<form>`:** Browser validation is suppressed; all validation is handled by the Zod schema via `useStructureFormValidation`.
