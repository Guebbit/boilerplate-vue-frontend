---
source: src/modules/users/views/UserEdit.vue
sha256: 103c775ba210a6e4e2e09dc463b37976e2028d19f4c4f987bc38337f352767ed
signature: 103c775ba210a6e4e2e09dc463b37976e2028d19f4c4f987bc38337f352767ed
generated_at: 2026-11-10T06:10:47.625353+00:00
model: ollama:qwen3.8:27b
---

# src/modules/users/views/UserEdit.vue

## Purpose

Admin-facing form for editing a single user's profile (username, role, locale, phone, website, avatar). It enforces server-driven permission gates on each control, confirms role changes and deactivation through a dedicated dialog, and sends a multipart `PATCH` only when a new avatar is attached. By design it exposes no email or password fields.

## Key elements

- **Named export** – `UserEditPage`; gives the SFC a stable name for devtools / `<KeepAlive>`.
- **`UserEditForm` interface** – the local data model: `username`, `role`, `locale`, `phone`, `website`, `imageUpload`.
- **`editSchema`** – Zod schema built from `usersSchema.pick(...)` extended with `role`, `locale`, and `imageUploadSchema`. Reuses create-form rules for shared fields to prevent drift.
- **`submitForm`** – validates, then (if the role changed) opens `UserAccessDialog` for confirmation before sending. Profile `PATCH` is dispatched first (skipped if only the role changed); the role assignment/revoke is a separate follow-up call. Deactivation also routes through the dialog.
- **`sendUserUpdate`** – wraps `store.updateUser` with `useAxiosUploadProgress` tracking for multipart uploads.
- **`onUserSaved`** – clears the local `File` handle, lifts the leave guard, and fires a success toast.
- **`rowActions`** (computed) – reflects the server's `actions` array for this account; drives which controls are enabled.
- **`canEditRole`** (computed) – requires both `assignRole` in `rowActions` and a non-empty `grantableRoles()` list.
- **`useStaleRecord` / `useBlockingError`** – handle 412 (stale ETag) and other API failures in-place next to the submit button rather than via toasts.
- **`activateAutoHydrate`** – populates the form from the store's `currentUser` once the fetch resolves; `role` defaults to `''` so the "changed" comparison is concrete.

## Relationships

- **`src/modules/users/store.ts`** – primary data source and action API (`fetchUser`, `updateUser`, `activateUser`, `deactivateUser`, `applyAccessChange`, `watchUser`). The component reads `currentUser` / `loading` via `storeToRefs`.
- **`src/modules/users/composables/use-user-access-dialog.ts`** – supplies the confirm-step dialog for role changes and deactivation; the component calls `requestAccessConfirmation` with `skipPicker: true` and awaits the result before proceeding.
- **`src/modules/users/components/UserAccessDialog.vue`** – rendered template for the confirmation dialog described above.
- **`src/modules/users/composables/use-role-options.ts`** – provides `grantableRoles` and `roleOptions` (the server's list of assignable roles) for the role `<select>`.
- **`src/modules/users/composables/use-user-summary.ts`** – derives the hero title/description and role/status chip labels for the page header.
- **`src/modules/users/schemas.ts`** – source of `usersSchema`, whose `username`, `phone`, and `website` rules are picked into `editSchema`.
- **`src/modules/users/tests/user-edit-view.spec.ts`** – unit/integration tests for this view.

## Notes

- **Two-phase save.** The profile `PATCH` and the role assignment are *separate* requests. A caller who can edit the profile but not assign roles can still save; an unchanged role never triggers the second call.
- **Avatar semantics.** An empty/absent `imageUpload` means "keep the existing image"; only a `File` instance triggers multipart encoding.
- **`role` baseline.** Auto-hydration coerces `role` to `''` (not `undefined`) so `roleChanged` compares against a concrete value and doesn't false-positive on two `undefined`s.
- **Locale options** are sourced from the app-wide `supportedLanguages` list, the same source used by `Profile.vue` and `UserCreate.vue`; validation is by select membership, not by a Zod string rule.
- **Leave guard** is gated on `isDirty` *and* the admin's auth session; `markSaved()` lifts it after a successful save.
- **Stale-record flow (412):** "Reload latest" forces a re-fetch (`fetchUser(id, { forced: true })`) which re-hydrates the form and refreshes the ETag for the next attempt.
