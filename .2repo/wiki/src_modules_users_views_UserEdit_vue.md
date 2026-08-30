# src/modules/users/views/UserEdit.vue

## Purpose

Vue 3 single-file component (named `UserEditPage`) that renders a single-user edit form. It loads a user by the `id` route prop, lets the user change email, password, and avatar, then persists the changes via the users store. An empty password or avatar field signals "leave unchanged."

## Key elements

- **`UserEditForm`** – interface for the form model: `{ email, password, imageUpload }`.
- **`editSchema`** – Zod schema built from `usersSchema.pick({ email })` extended with a `z.preprocess`-wrapped optional password (empty string → `undefined`) and `imageUpload` from `imageUploadSchema`. Validation messages are i18n thunks resolved at parse time.
- **`useAppForm<UserEditForm>`** – shared composable providing `form`, `formErrors`, `isSubmitting`, `handleSubmit`, `activateAutoHydrate`, `applyServerErrors`, `resetForm`.
- **`activateAutoHydrate(computed)`** – hydrates the form once `currentUser` resolves (pre-fills email, blanks password).
- **`useUploadProgress()`** – exposes `uploadProgress` (percentage shown in `FormImageUpload`) and `trackUpload` (wraps the API call with progress tracking).
- **`submitForm()`** – validates, then calls `updateUser(id, { email, password, imageUpload })`; on success clears `form.imageUpload` and shows a toast; on failure tries `applyServerErrors` before falling back to `notifyErrorMessages`.
- **`watchUser(() => id)`** – re-fetches the user whenever the route `id` prop changes.
- **Computed display values** – `heroTitle`, `heroDescription`, `userRole`, `userStatus` drive the hero/stats cards.
- **Template** – `ItemDetailLayout` with hero, stat cards, a `<form>` (email, password, `FormImageUpload`, submit/reset buttons), an aside with metadata fields, and action buttons linking to `UserTarget` and `UsersList` routes.

## Relationships

No direct interaction with the listed graph neighbor (`src/infrastructure/utils/logger.ts`) is present in this file.

## Notes

- **Empty = unchanged convention:** password and `imageUpload` use "empty field means don't send" semantics, enforced at the schema level (`z.preprocess`) and at submit time (`password || undefined`).
- **Post-upload reset:** after a successful save, `form.value.imageUpload` is explicitly set to `undefined` so the next save does not re-upload the same bytes (same pattern as `ProductEdit.vue`).
- **Schema is built once:** i18n messages are thunks resolved at parse time, so the schema need not be rebuilt on language change.
- **Route-prop driven:** the component receives `id` as a prop (not from `$route.params` directly), and `watchUser` handles refetching on change. A missing `id` makes `submitForm` a no-op.
