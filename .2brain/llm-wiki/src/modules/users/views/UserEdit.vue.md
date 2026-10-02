---
source: src/modules/users/views/UserEdit.vue
sha256: 9d35215f343a3cc75635a2e75a639d65e79565ecd460e9da16913769e8a29663
generated_at: 2026-10-02T15:53:20.735354+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserEdit.vue

## Purpose
Admin-facing page for editing a single user record (email, username, password, role, active status, locale, phone, website, avatar). Built on the shared `useStructureFormValidation` composable, it diffs the form against the loaded record so the `PATCH` only carries changed fields, and gates role/active changes behind a `UserAccessDialog` confirmation step.

## Key elements
- **`UserEditForm`** (interface) — the form data model: `email`, `username`, `password`, `role`, `active`, `locale`, `phone`, `website`, `imageUpload`.
- **`editSchema`** (Zod) — validation schema built by picking `email`/`username`/`phone`/`website` from the shared `usersSchema` and extending with `password` (preprocessed: `''` → `undefined`), `role`, `active`, `locale`, and `imageUpload`. Built once; i18n messages are thunks resolved at parse time.
- **`useStructureFormValidation`** call — provides `form`, `formErrors`, `isSubmitting`, `handleSubmit`, `activateAutoHydrate`, `applyServerErrors`, and re-validates on locale change.
- **`activateAutoHydrate`** — populates the form from `currentUser` once the record resolves. `role` defaults to `''`, `active` to `true`, and `password` to `''` so change-detection comparisons have a concrete baseline.
- **`useUserAccessDialog`** — supplies `requestAccessConfirmation` (promise-returning) used in `submitForm` to gate role/active changes. Always called with `skipPicker: true` since values are already chosen in the form.
- **`useStaleRecord`** — handles 412 responses; `reloadLatest` re-fetches the user with `{ forced: true }` to refresh the `ETag`.
- **`useBlockingError`** — renders a persistent inline error next to the save button on API failure (as opposed to a transient toast).
- **`submitForm`** — validates, optionally confirms via the access dialog, diffs form against the loaded record via `toRequestBody('UpdateUserByIdBody', …)`, sends `updateUser(id, { …body, imageUpload }, { requestOptions })` (multipart only when an avatar file is present), clears the local `File` on success, and toasts.
- **`useAxiosUploadProgress`** — tracks avatar upload progress, surfaced through `FormImageUpload`.
- **Hero / chips** — `heroTitle`, `heroDescription`, `userRole`, `userStatus` computed properties drive the page header and status chips.
- **`localeOptions`** — maps `supportedLanguages` to `{ value, title }` for the locale `<select>`.

## Relationships
The three listed graph neighbors do not appear as direct imports or references in the visible portion of this file. The file's confirmed upstream dependencies are `@/modules/users/store` (`useUsersStore`), `@/modules/users/composables/use-user-access-dialog.ts`, `@/modules/users/schemas.ts`, `@/modules/users/domain`, `@/infrastructure/utils/forms.ts` (`toRequestBody`), `@/infrastructure/utils/use-stale-record.ts`, `@/infrastructure/utils/use-blocking-error.ts`, `@/infrastructure/utils/uploads.ts` (`imageUploadSchema`), and several `@/ui` and `@/i18n` modules.

## Notes
- **Empty ≠ send.** An empty `password` or `imageUpload` field means "leave unchanged"; the diff in `toRequestBody` omits them. Sending an unchanged `role` in the `PATCH` body would trigger the backend's `assertCanGrant` check and could reject a non-admin editor, so `submitForm` only includes `role`/`active` when they actually differ from the loaded record.
- **Role is data, not an enum in the UI.** The role chip displays the raw string (`formatText`), not a translated "admin"/"user" pair, because deployments can add custom roles.
- **Avatar file is cleared after save.** After a successful upload, `form.value.imageUpload` is set to `undefined` to prevent re-uploading the same bytes on a subsequent save.
- **412 handling.** A stale-save (412) is surfaced through `useStaleRecord` → `useBlockingError`'s inline alert, with a "Reload latest" action that bypasses the store cache (`fetchUser(id, { forced: true })`).
- **Component name** is `UserEditPage` (set in the options `<script>` block), not derived from the filename.
