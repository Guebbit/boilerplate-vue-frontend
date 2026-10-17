---
source: src/modules/users/views/UserEdit.vue
sha256: 20c95e6056a329494016845ceeed77e3c77738efc5ed5022abacf764887c805a
generated_at: 2026-10-17T01:49:56.368362+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserEdit.vue

## Purpose

Admin-facing page for editing a single user's profile (username, role, active status, locale, phone, website, avatar). It deliberately omits email and password fields—credentials are owner-only. Role and active-status changes require an explicit `UserAccessDialog` confirmation step before any `PATCH` is dispatched, and the request body only includes those fields when they actually differ from the loaded record.

## Key elements

- **`UserEditPage`** (named export) — stable component name for devtools and `<KeepAlive>`; required alongside `<script setup>` which cannot declare one.
- **`UserEditForm`** (interface) — the editable data model: `username`, `role`, `active`, `locale`, `phone`, `website`, `imageUpload`.
- **`editSchema`** (zod) — validation rules; reuses `usersSchema` fields for `username`/`phone`/`website` to stay in sync with the create form, adds optional `role`/`active`/`locale`, and an `imageUploadSchema` for the optional avatar file.
- **`useStructureFormValidation`** — toolkit composable providing form state, validation, `handleSubmit`, `activateAutoHydrate`, and `applyServerErrors`.
- **`activateAutoHydrate`** — maps `currentUser` from the store into the form; `role` and `active` default to `''`/`true` so change-detection compares against a concrete baseline.
- **`rowActions`** (computed) — the server-issued `actions` array for this account; gates which controls are enabled (`update`, `ban`, etc.).
- **`canEditRole`** (computed) — role select is shown only when `rowActions` includes `update`, the target is not the signed-in admin, and at least one grantable role exists.
- **`submitForm`** — validates, then (if role or active changed) awaits `requestAccessConfirmation` from `UserAccessDialog`; on cancel the form is left untouched. The `PATCH` body includes `role`/`active` **only** when they differ, because the backend's `assertCanGrant` fires on any PATCH that names a role.
- **`useBlockingError` / `useStaleRecord`** — in-place error display for failed saves and 412 (stale) responses; the latter re-fetches the record with `forced: true` and re-hydrates the form.
- **`useAxiosUploadProgress`** — drives the progress indicator in `FormImageUpload` during multipart avatar saves.

## Relationships

- **`useUsersStore`** (`store.ts`) — source of `currentUser`, `loading`, `watchUser`, `updateUser`, `fetchUser`; the form auto-hydrates from `currentUser` and saves via `updateUser`.
- **`usersSchema`** (`schemas.ts`) — the shared zod schema; `editSchema` picks `username`, `phone`, `website` from it to avoid rule drift with the create form.
- **`useRoleOptions`** (`use-role-options.ts`) — provides `grantableRoles()` and `roleOptions` for the role `<select>`.
- **`useUserAccessDialog`** (`use-user-access-dialog.ts`) — supplies the `request`/`confirm`/`cancel` lifecycle for the role/active confirmation step; this page always passes `skipPicker: true`.
- **`UserAccessDialog`** (`UserAccessDialog.vue`) — rendered as a dialog component; opened when `submitForm` detects a role or active change and the user confirms or cancels.
- **`user-edit-view.spec.ts`** (tests) — unit/integration tests exercising this component's validation, submission, and access-dialog flow.

## Notes

- The `role` and `active` fields must never be included in the PATCH body when unchanged; doing so triggers the backend's grant check (`assertCanGrant`) and will reject editors who lack admin-grant keys.
- An empty `imageUpload` field means "keep the existing avatar"; a non-empty value triggers a multipart upload.
- The admin cannot change their own role—the select is hidden and the server would refuse it anyway.
- `activateAutoHydrate` intentionally uses `?? ''` and `?? true` (not `?? undefined`) so that the change-detection comparisons in `submitForm` have a concrete baseline and don't always read as "unchanged".
- The validation schema is built once at module level; its error messages are thunks resolved at parse time, so it tracks the active i18n locale without needing to be rebuilt.
