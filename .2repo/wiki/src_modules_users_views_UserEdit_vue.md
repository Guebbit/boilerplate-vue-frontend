# src/modules/users/views/UserEdit.vue

## Purpose

Single-user edit page. Loads a user by the route `id` prop, presents a form (email, optional password, optional avatar upload), and persists changes via the users store. An empty password or avatar field is a no-op ("leave as is"); a new avatar triggers a multipart upload with progress tracking.

## Key elements

- **`editSchema`** — Zod schema built from `usersSchema.pick({ email: true })` extended with an optional `password` (empty string preprocessed to `undefined`) and an `imageUpload` field. Built once; i18n messages are thunks resolved at parse time via `revalidateOn: locale`.
- **`useStructureFormValidation<UserEditForm>`** — Shared composable from `@guebbit/vue-toolkit` providing `form`, `formErrors`, `showFormErrors`, `isSubmitting`, `handleSubmit`, `resetForm`, `activateAutoHydrate`, and `applyServerErrors`.
- **`activateAutoHydrate(computed(…))`** — Populates the form from `currentUser` once the fetch resolves; password is always reset to `''`.
- **`trackUpload(file, send)`** — Wraps an API call with axios `onUploadProgress` tracking (0–1 fraction); disabled when no file is present.
- **`submitForm`** — Validates, calls `updateUser(id, { email, password, imageUpload }, options)`, clears `form.imageUpload` on success to prevent re-uploading the same bytes, and surfaces server errors via `applyServerErrors` / `notifyErrorMessages`.
- **`watchUser(() => id)`** — Triggers a (re)fetch when the route id changes.
- **Template** — `LayoutDefault` → `ItemDetailLayout` with hero, stats (id / admin / active), a `<form>` with `v-text-field` (email, password) and `FormImageUpload`, plus an aside card with created/updated timestamps.

## Relationships

- **`src/infrastructure/utils/logger.ts`** (listed graph neighbor) — No import or direct reference is visible in this file. It may be a transitive dependency pulled in through `useNotificationsStore` or other toolkit/store modules, but no code path in this SFC calls it explicitly.

## Notes

- `form.value.imageUpload` is set back to `undefined` after a successful submit. Without this, the same `File` object would be re-serialized on every subsequent save (same pattern as `ProductEdit.vue`).
- Password field is intentionally optional: empty string is preprocessed to `undefined` so the API call omits the field entirely.
- `event.progress` can be `undefined` for chunked/compressed requests; the code falls back to `0` to keep the progress bar stable.
- The `id` prop is optional (`id?: string`); `submitForm` is a no-op if `id` is falsy, and the hero title falls back to the route id or a generic page title.
- Validation re-runs on locale change (`revalidateOn: locale`) without rebuilding the schema.
