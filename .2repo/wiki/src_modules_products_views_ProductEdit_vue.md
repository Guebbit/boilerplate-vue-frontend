# src/modules/products/views/ProductEdit.vue

## Purpose

Edit form for a single product. It auto-hydrates from the store's `currentProduct` once the record is fetched by `watchProduct`, then persists field changes (title, price, description, active flag) and an optional replacement image through the store's multipart-aware `updateProduct`.

## Key elements

- **`ProductEditForm`** (interface) — shape of the editable fields: `title`, `price`, `description`, `active`, `imageUpload`.
- **`editSchema`** (Zod) — built once via `productsSchema.pick({title, price}).extend(...)`. Messages are thunks so the active i18n locale is picked up at parse time without rebuilding the schema.
- **`useAppForm<ProductEditForm>`** — provides `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `resetForm`, `handleSubmit`, `activateAutoHydrate`, `applyServerErrors`.
- **`activateAutoHydrate(computed(...))`** — maps `currentProduct` into the form model the moment the store resolves.
- **`submitForm`** — validates via `handleSubmit`, then calls `trackUpload(imageUpload, …)` wrapping `updateProduct(id, …)`. On success clears `form.imageUpload` so the served `imageUrl` drives the preview and a second save doesn't re-upload the same bytes.
- **`heroTitle` / `heroDescription`** (computed) — fallback chain: product title → route `id` → i18n page title; description or empty-value glyph.
- **`watchProduct(() => id)`** — re-fetches whenever the route param changes.
- **`useUploadProgress`** — exposes `uploadProgress` (bound to `FormImageUpload`) and `trackUpload` (wraps the multipart call).

## Relationships

- **`useProductsStore`** (`src/modules/products/store`) — source of `watchProduct`, `updateProduct`, `currentProduct`, `loading`.
- **`productsSchema`** (`src/modules/products/schemas.ts`) — base Zod schema extended for the edit form.
- **`useAppForm`** (`src/infrastructure/composables/use-app-form.ts`) — generic form-state + validation + submit machinery.
- **`useUploadProgress`** (`src/infrastructure/composables/use-upload-progress.ts`) — progress tracking for the multipart image upload.
- **`imageUploadSchema`** (`src/infrastructure/utils/uploads.ts`) — validation for the optional `File` field.
- **`notifyErrorMessages`** (`src/infrastructure/utils/errors.ts`) — fallback toast when the error isn't a server-field error.
- **`routerLinkI18n`** (`src/infrastructure/i18n/router-link.ts`) — i18n-aware navigation links in the footer actions.
- **UI components** — `LayoutDefault`, `ItemDetailLayout`, `ItemDetailHero`, `CardDetail`, `CardInfo`, `CardMaterialStat`, `ItemDetailField`, `FormImageUpload` provide the page shell and form controls.

## Notes

- **i18n schema pattern:** `editSchema` is constructed once; its error messages are thunks resolved at parse time. Do not rebuild the schema per locale (same convention as `src/modules/users/schemas.ts`).
- **TS narrowing in closures:** `form.value.title` is destructured into a local const *before* the `trackUpload` callback because TypeScript's narrowing on a mutable ref does not survive into a nested closure. Preserve this pattern if the submit body grows.
- **Image upload is idempotent-by-design:** after a successful save, `form.imageUpload` is set to `undefined`. The store has already merged the server-returned `imageUrl` into `currentProduct`, which `FormImageUpload` picks up as `:current-image-url`.
- **`novalidate` on `<form>`:** native HTML validation is disabled; all validation is handled by Zod + `useAppForm`.
- **Guard against missing id / title / price:** `submitForm` is a no-op if any of these are absent, preventing a malformed API call.
