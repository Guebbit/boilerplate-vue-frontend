---
source: src/modules/users/views/UserCreate.vue
sha256: 37d6065e1c470ee2b805819127a82c3538a1046ee7d9ffd7f4e7973600edfdbe
generated_at: 2026-10-17T01:49:39.293938+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserCreate.vue

## Purpose

The user-creation form page. Collects email, username, role, locale, active-status, and an optional avatar upload, validates the input client-side with a Zod schema, then delegates to the users store which branches between multipart (avatar present) and JSON submission. There is intentionally no password field: the new user is emailed a self-service credential-setup link.

## Key elements

- **`UserCreatePage`** – Named component block (separate `<script>` block) so the SFC has a stable name for devtools / `<KeepAlive>`.
- **`UserCreateForm`** – Interface describing the form shape: `email`, `username`, `role?`, `active?`, `locale?`, `imageUpload?`.
- **`createSchema`** – Zod schema built from `usersSchema.pick({ email, username })` extended with `role`, `active`, `locale`, and `imageUpload` (from `imageUploadSchema`).
- **`useStructureFormValidation<UserCreateForm>`** – Shared composable providing `form`, `formErrors`, `showErrors`, `isSubmitting`, `handleSubmit`, `applyServerErrors`. Revalidates on locale change.
- **`useAxiosUploadProgress`** – Tracks multipart upload progress, surfaced to `FormImageUpload` via `uploadProgress`.
- **`useBlockingError`** – Per-form inline error state (`submitError`, `reportSubmitError`, `clearSubmitError`) rendered by `InlineErrorAlert` beside the submit button, distinct from toast notifications.
- **`submitForm`** – Clears prior inline errors, runs `handleSubmit`, tracks upload progress, calls `createUser` from the store, shows a success toast, and navigates to the new user's detail route (`UserTarget`). Unmapped API errors are reported via `reportSubmitError`.
- **`localeOptions`** – Computed list of `supportedLanguages` mapped to `{ value, title }` pairs, localized with the current locale.
- **`useRoleOptions`** – Provides `grantableRoles()` (server-authorized roles) and `roleOptions()` for the role `<v-select>`; the select is hidden entirely when the caller can assign no roles.

## Relationships

- **`src/modules/users/schemas.ts`** – Imports `usersSchema` as the base for `createSchema` (picks `email` and `username` fields).
- **`src/modules/users/store.ts`** – Imports `useUsersStore` to call `createUser` with the validated form payload and optional request options.
- **`src/modules/users/composables/use-role-options.ts`** – Provides the server-driven role list for the select and the visibility guard (`grantableRoles().length > 0`).
- **`src/modules/users/tests/user-create-view.spec.ts`** – Unit/integration test suite covering this view's form rendering, validation, and submission behavior.

## Notes

- The `formElement` option passed to `useStructureFormValidation` is a getter (`() => card.value?.formElement`) rather than a direct ref, so the `<form>` element is resolved lazily at submit time—avoids a race with `FormCard` still mounting. An ESLint disable comment acknowledges a TS-ESLint limitation with SFC `InstanceType` resolution.
- `active` defaults to `true` in initial form state, mirroring the API's `CreateUserRequest.active` default; the switch therefore reflects "what an omitted value would do."
- The role select is conditionally rendered (`v-if="grantableRoles().length > 0"`); when hidden, the server applies its own default role.
- Navigation to the new user's page uses `void router.push(...)` so a `NavigationFailure` cannot convert a completed create into an error.
- The file imports `logger.ts` is **not** used directly in this component; the dependency-graph edge likely reflects a transitive or shared-infrastructure link.
