# src/modules/users/views/UserCreate.vue

## Purpose

Vue single-file component that renders the "Create User" form page. It collects email, username, password, admin/active flags, and an optional avatar file, validates them via a Zod schema, and delegates submission to the users store—sending a multipart request when an avatar is present or JSON otherwise (the branch is handled inside the store).

## Key elements

- **`UserCreateForm`** — local interface describing the form state (email, username, password, admin, active, imageUpload).
- **`createSchema`** — Zod schema built once from `usersSchema.pick({email, username}).extend({password, admin, active, imageUpload})`. Messages are thunks resolved at parse time in the active locale.
- **`useStructureFormValidation<UserCreateForm>`** — shared composable from `@guebbit/vue-toolkit` that owns `form`, `formErrors`, `isSubmitting`, and `handleSubmit`. `formElement` is a getter (`() => card.value?.formElement`) so the DOM ref is resolved lazily after `FormCard` mounts.
- **`useToolkitUploadProgress`** — tracks the 0–1 `onUploadProgress` fraction from Axios; reports `0` when `event.progress` is `undefined` (chunked/compressed transfer).
- **`trackUpload(file, send)`** — wraps an API call with the progress tracker, enabled only when `file` is present.
- **`submitForm`** — orchestrates the full flow: `handleSubmit` → `trackUpload` → `createUser(...)` → success toast + `router.push` to `UserTarget`; on error, `notifyErrorMessages` surfaces toasts.
- **Template** — `LayoutDefault` wrapping a `FormCard` with Vuetify inputs (`v-text-field`, `v-switch`) and `FormImageUpload`; all labels are i18n keys under `user-create-page.*`.

## Relationships

- **`src/infrastructure/utils/logger.ts`** — listed as a graph neighbor but not imported or referenced directly in this file; any interaction is transitive (e.g., through the users store or the validation composable).

## Notes

- The success navigation is intentionally fire-and-forget (`void router.push(...)`) so a `NavigationFailure` cannot convert a completed create into an error toast.
- `formElement` is passed as a **getter**, not a value—`FormCard` may not be mounted when the composable is first evaluated, so a plain ref would be `undefined`.
- `revalidateOn: locale` re-runs Zod validation (and re-renders error messages) whenever the active locale changes, because schema messages are locale-bound thunks.
- The `imageUpload` field type is `File | undefined`; when absent the store sends a plain JSON body, when present it sends `multipart/form-data`—the branch logic is in the store, not here.
